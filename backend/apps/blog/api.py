from typing import List, Optional
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from ninja import Router, Query
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from .models import BlogPost, BlogCategory, PostLike, PostSave, Comment, PostFlag
from .schema import BlogPostIn, BlogPostOut, BlogPostListOut, BlogCategoryOut, CommentIn
from .services import BlogService
import bleach

router = Router()

ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img', 'video', 'iframe',
    'pre', 'code', 'span', 'div'
]

ALLOWED_ATTRIBUTES = {
    '*': ['class', 'style'],
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'width', 'height'],
    'video': ['src', 'controls'],
    'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen']
}

def sanitize_html(html: str) -> str:
    return bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)


def format_post(post, user=None):
    liked = False
    saved = False
    flagged = False
    if user:
        liked = PostLike.objects.filter(post=post, user=user).exists()
        saved = PostSave.objects.filter(post=post, user=user).exists()
        flagged = PostFlag.objects.filter(post=post, user=user).exists()
    return {
        "id": str(post.id),
        "title": post.title,
        "slug": post.slug,
        "content": post.content,
        "excerpt": post.excerpt or post.content[:200],
        "cover_image": post.cover_image or "",
        "category": {
            "id": str(post.category.id),
            "name": post.category.name,
            "slug": post.category.slug,
            "icon": post.category.icon,
            "description": post.category.description,
            "post_count": 0
        } if post.category else None,
        "author": {
            "id": str(post.author.id),
            "full_name": post.author.full_name,
            "profile_pic": post.author.profile_pic or ""
        },
        "tags": post.tags,
        "tag_list": post.tag_list,
        "reading_time": post.reading_time,
        "view_count": post.view_count,
        "likes_count": post.likes_count,
        "saves_count": post.saves_count,
        "flags_count": post.flags_count,            # ← NEW
        "is_liked": liked,
        "is_saved": saved,
        "is_flagged": flagged,                      # ← NEW
        "is_featured": post.is_featured,
        "is_published": post.is_published,
        "is_hidden": post.is_hidden,
        "published_at": post.published_at,
        "created_at": post.created_at,
    }

def _serialize_comment(comment, user):
    return {
        "id": str(comment.id),
        "body": comment.body,
        "user": {
            "id": str(comment.user.id),
            "full_name": comment.user.full_name,
            "profile_pic": comment.user.profile_pic or "",
        },
        "parent_id": str(comment.parent.id) if comment.parent else None,
        "created_at": str(comment.created_at),
        "replies": [_serialize_comment(r, user) for r in comment.replies.filter(is_active=True)]
    }

# ============================================
# PUBLIC ENDPOINTS
# ============================================

@router.get("/posts/", auth=JWTAuth(), response=List[dict])
def list_posts(request, category: str = None, search: str = None, tag: str = None,
               featured: bool = False, sort: str = 'latest'):
    posts = BlogService.get_posts(category, search, tag, featured, sort)

    if request.auth and request.auth.role == 'admin':
        pass
    elif request.auth:
        posts = posts.filter(
            Q(is_published=True) | Q(author=request.auth)
        )
    else:
        posts = posts.filter(is_published=True)

    return [format_post(p, request.auth) for p in posts]


@router.get("/posts/{slug}/", auth=JWTAuth(), response=dict)
def get_post(request, slug: str):
    post = get_object_or_404(BlogPost, slug=slug)

    if not post.is_published:
        user = request.auth
        if not (user and (user == post.author or user.role == 'admin')):
            raise HttpError(404, "Post not found")

    BlogService.increment_view(post)
    return format_post(post, request.auth)


@router.get("/featured/", auth=JWTAuth(), response=List[dict])
def get_featured(request):
    posts = BlogService.get_featured()
    return [format_post(p, request.auth) for p in posts]

@router.get("/trending/", auth=JWTAuth(), response=List[dict])
def get_trending(request):
    posts = BlogService.get_trending()
    return [format_post(p, request.auth) for p in posts]

@router.get("/categories/", auth=JWTAuth(), response=List[dict])
def list_categories(request):
    categories = BlogService.get_categories()
    return [{
        "id": str(c.id),
        "name": c.name,
        "slug": c.slug,
        "description": c.description,
        "icon": c.icon,
        "post_count": c.post_count
    } for c in categories]

# ============================================
# USER INTERACTION ENDPOINTS
# ============================================

@router.post("/posts/{post_id}/like/", auth=JWTAuth())
def toggle_like(request, post_id: str):
    post = get_object_or_404(BlogPost, id=post_id)
    like, created = PostLike.objects.get_or_create(post=post, user=request.auth)
    if not created:
        like.delete()
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        post.likes_count += 1
        liked = True
    post.save(update_fields=['likes_count'])
    return {"liked": liked, "likes_count": post.likes_count}

@router.post("/posts/{post_id}/save/", auth=JWTAuth())
def toggle_save(request, post_id: str):
    post = get_object_or_404(BlogPost, id=post_id)
    save, created = PostSave.objects.get_or_create(post=post, user=request.auth)
    if not created:
        save.delete()
        post.saves_count = max(0, post.saves_count - 1)
        saved = False
    else:
        post.saves_count += 1
        saved = True
    post.save(update_fields=['saves_count'])
    return {"saved": saved, "saves_count": post.saves_count}

@router.get("/saved/", auth=JWTAuth(), response=List[dict])
def get_saved_posts(request):
    saved = PostSave.objects.filter(user=request.auth).select_related('post__category', 'post__author')
    return [format_post(s.post, request.auth) for s in saved]

# ============================================
# COMMENT ENDPOINTS
# ============================================

@router.get("/posts/{post_id}/comments/", auth=JWTAuth(), response=List[dict])
def list_comments(request, post_id: str):
    post = get_object_or_404(BlogPost, id=post_id)
    comments = Comment.objects.filter(post=post, parent=None, is_active=True).prefetch_related('replies')
    return [_serialize_comment(c, request.auth) for c in comments]

@router.post("/posts/{post_id}/comments/", auth=JWTAuth())
def create_comment(request, post_id: str, data: CommentIn):
    post = get_object_or_404(BlogPost, id=post_id)
    parent = None
    if data.parent_id:
        parent = get_object_or_404(Comment, id=data.parent_id)
    comment = Comment.objects.create(
        post=post,
        user=request.auth,
        body=data.body,
        parent=parent
    )
    return _serialize_comment(comment, request.auth)

# ============================================
# ADMIN ENDPOINTS
# ============================================

@router.post("/posts/", auth=JWTAuth())
def create_post(request, data: BlogPostIn):
    user = request.auth
    if user.role != 'admin':
        return {"error": "Only admins can create posts"}
    post = BlogPost.objects.create(
        title=data.title,
        content=sanitize_html(data.content),
        excerpt=data.excerpt,
        cover_image=data.cover_image,
        author=user,
        tags=data.tags,
        is_featured=data.is_featured,
        is_published=data.is_published,
        published_at=timezone.now() if data.is_published else None
    )
    if data.category_id:
        post.category = get_object_or_404(BlogCategory, id=data.category_id)
        post.save()
    return format_post(post, user)

@router.put("/posts/{post_id}/edit/", auth=JWTAuth())
def update_post(request, post_id: str, data: BlogPostIn):
    user = request.auth
    if user.role != 'admin':
        return {"error": "Only admins can edit posts"}
    post = get_object_or_404(BlogPost, id=post_id)
    post.title = data.title
    post.content = sanitize_html(data.content)
    post.excerpt = data.excerpt
    post.cover_image = data.cover_image
    post.tags = data.tags
    post.is_featured = data.is_featured
    post.is_published = data.is_published
    if data.is_published and not post.published_at:
        post.published_at = timezone.now()
    if data.category_id:
        post.category = get_object_or_404(BlogCategory, id=data.category_id)
    post.save()
    return format_post(post, user)

@router.delete("/posts/{post_id}/delete/", auth=JWTAuth())
def delete_post(request, post_id: str):
    user = request.auth
    post = get_object_or_404(BlogPost, id=post_id)
    if user.role != 'admin' and post.author != user:
        raise HttpError(403, "You do not have permission to delete this post.")
    post.delete()
    return {"message": "Post deleted successfully"}

# ============================================
# HIDE / UNHIDE (Admin only, uses SLUG)
# ============================================
@router.put("/posts/slug/{slug}/hide/", auth=JWTAuth())
def toggle_hide_by_slug(request, slug: str):
    """Admin only: toggle hidden status of a blog post by slug."""
    if request.auth.role != 'admin':
        raise HttpError(403, "Only admins can hide/unhide posts.")
    post = get_object_or_404(BlogPost, slug=slug)
    post.is_hidden = not post.is_hidden
    post.save(update_fields=['is_hidden'])
    return {"slug": post.slug, "is_hidden": post.is_hidden}

# ============================================
# MY POSTS
# ============================================
@router.get("/my-posts/", auth=JWTAuth())
def my_posts(request):
    """List posts created by the currently authenticated user."""
    posts = BlogPost.objects.filter(author=request.auth).order_by('-published_at')
    return [format_post(p, request.auth) for p in posts]

# ═══════════════════════════════════════════════════
# FLAGGING ENDPOINT (NEW)
# ═══════════════════════════════════════════════════
@router.post("/posts/{post_id}/flag/", auth=JWTAuth())
def toggle_flag(request, post_id: str):
    post = get_object_or_404(BlogPost, id=post_id)
    user = request.auth

    # Author cannot flag own post
    if post.author == user:
        raise HttpError(400, "You cannot flag your own post.")

    flag, created = PostFlag.objects.get_or_create(post=post, user=user)

    if created:
        post.flags_count += 1
    else:
        flag.delete()
        post.flags_count = max(0, post.flags_count - 1)

    # If flag count reaches threshold, hide/unlist the post
    THRESHOLD = 10
    if post.flags_count >= THRESHOLD:
        post.is_published = False
        post.is_hidden = True

    post.save()

    return {
        "flagged": created,
        "flags_count": post.flags_count
    }
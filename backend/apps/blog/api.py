from typing import List, Optional
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router, Query
from ninja.errors import HttpError
from common.jwt_auth import JWTAuth
from .models import BlogPost, BlogCategory, PostLike, PostSave, Comment
from .schema import BlogPostIn, BlogPostOut, BlogPostListOut, BlogCategoryOut, CommentIn
from .services import BlogService

router = Router()

def format_post(post, user=None):
    liked = False
    saved = False
    if user:
        liked = PostLike.objects.filter(post=post, user=user).exists()
        saved = PostSave.objects.filter(post=post, user=user).exists()
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
        "is_liked": liked,
        "is_saved": saved,
        "is_featured": post.is_featured,
        "is_published": post.is_published,
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
    return [format_post(p, request.auth) for p in posts]

@router.get("/posts/{slug}/", auth=JWTAuth(), response=dict)
def get_post(request, slug: str):
    post = get_object_or_404(BlogPost, slug=slug, is_published=True)
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
        content=data.content,
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
    post.content = data.content
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
    # Allow deletion if user is admin OR is the author of the post
    if user.role != 'admin' and post.author != user:
        raise HttpError(403, "You do not have permission to delete this post.")
    post.delete()
    return {"message": "Post deleted successfully"}

# ============================================
# MY POSTS (NEW)
# ============================================
@router.get("/my-posts/", auth=JWTAuth())
def my_posts(request):
    """List posts created by the currently authenticated user."""
    posts = BlogPost.objects.filter(author=request.auth).order_by('-published_at')
    return [format_post(p, request.auth) for p in posts]
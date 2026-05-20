from django.db.models import Q, Count
from django.utils import timezone
from .models import BlogPost, BlogCategory, PostLike, PostSave

class BlogService:
    @staticmethod
    def get_posts(category=None, search=None, tag=None, featured_only=False, sort='latest'):
        """Get published blog posts with filters"""
        posts = BlogPost.objects.filter(is_published=True)
        
        if category:
            posts = posts.filter(category__slug=category)
        if search:
            posts = posts.filter(
                Q(title__icontains=search) | 
                Q(content__icontains=search) |
                Q(tags__icontains=search)
            )
        if tag:
            posts = posts.filter(tags__icontains=tag)
        if featured_only:
            posts = posts.filter(is_featured=True)
        
        if sort == 'popular':
            posts = posts.order_by('-view_count')
        elif sort == 'trending':
            posts = posts.order_by('-likes_count')
        else:
            posts = posts.order_by('-published_at')
        
        return posts.select_related('category', 'author')
    
    @staticmethod
    def get_trending(limit=5):
        """Get trending posts based on likes and views"""
        return BlogPost.objects.filter(
            is_published=True
        ).order_by('-likes_count', '-view_count')[:limit]
    
    @staticmethod
    def get_featured(limit=5):
        """Get featured posts"""
        return BlogPost.objects.filter(
            is_published=True, 
            is_featured=True
        ).order_by('-published_at')[:limit]
    
    @staticmethod
    def get_user_interactions(user, posts):
        """Get which posts user has liked/saved"""
        post_ids = [p.id for p in posts]
        liked = set(PostLike.objects.filter(
            user=user, post_id__in=post_ids
        ).values_list('post_id', flat=True))
        saved = set(PostSave.objects.filter(
            user=user, post_id__in=post_ids
        ).values_list('post_id', flat=True))
        return liked, saved
    
    @staticmethod
    def increment_view(post):
        """Increment post view count"""
        post.view_count += 1
        post.save(update_fields=['view_count'])
    
    @staticmethod
    def get_categories():
        """Get all categories with post counts"""
        return BlogCategory.objects.annotate(
            post_count=Count('posts', filter=Q(posts__is_published=True))
        ).all()

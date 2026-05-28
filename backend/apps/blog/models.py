from django.db import models
from django.utils.text import slugify
from common.models import BaseModel

class BlogCategory(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, default='📝')
    
    class Meta:
        verbose_name_plural = 'Blog Categories'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.icon} {self.name}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

class BlogPost(BaseModel):
    title = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True, blank=True)
    content = models.TextField()
    excerpt = models.TextField(max_length=500, blank=True)
    cover_image = models.URLField(blank=True)
    category = models.ForeignKey(BlogCategory, on_delete=models.SET_NULL, null=True, related_name='posts')
    author = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='blog_posts')
    tags = models.CharField(max_length=255, blank=True, help_text='Comma separated tags')
    reading_time = models.IntegerField(default=1)
    view_count = models.IntegerField(default=0)
    likes_count = models.IntegerField(default=0)
    saves_count = models.IntegerField(default=0)
    flags_count = models.IntegerField(default=0)          # ← NEW
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    is_hidden = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['is_published', 'is_featured']),
            models.Index(fields=['category']),
            models.Index(fields=['slug']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        # Calculate reading time (avg 200 words per minute)
        word_count = len(self.content.split())
        self.reading_time = max(1, round(word_count / 200))
        super().save(*args, **kwargs)
    
    @property
    def tag_list(self):
        return [t.strip() for t in self.tags.split(',')] if self.tags else []

class PostLike(BaseModel):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='blog_likes')
    
    class Meta:
        unique_together = ['post', 'user']
    
    def __str__(self):
        return f"{self.user.full_name} liked {self.post.title}"

class PostSave(BaseModel):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='saves')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='blog_saves')
    
    class Meta:
        unique_together = ['post', 'user']
    
    def __str__(self):
        return f"{self.user.full_name} saved {self.post.title}"

class Comment(BaseModel):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='blog_comments')
    body = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.full_name} on {self.post.title}"

# ══════════════════════════════════════════════════
# NEW: Flagging model
# ══════════════════════════════════════════════════
class PostFlag(BaseModel):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='flags')
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='blog_flags')
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ['post', 'user']
        verbose_name = 'Post Flag'
        verbose_name_plural = 'Post Flags'

    def __str__(self):
        return f"{self.user.full_name} flagged {self.post.title}"
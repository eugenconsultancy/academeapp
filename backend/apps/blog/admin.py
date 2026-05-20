from django.contrib import admin
from .models import BlogCategory, BlogPost, PostLike, PostSave

@admin.register(BlogCategory)
class BlogCategoryAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'slug', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'author', 'is_published', 'is_featured', 'view_count', 'likes_count', 'published_at')
    list_filter = ('is_published', 'is_featured', 'category')
    search_fields = ('title', 'content', 'tags')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('view_count', 'likes_count', 'saves_count', 'reading_time')
    date_hierarchy = 'published_at'

@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')

@admin.register(PostSave)
class PostSaveAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')

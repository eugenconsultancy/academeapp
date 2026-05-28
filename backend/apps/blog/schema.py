from ninja import Schema
from datetime import datetime
from typing import Optional, List


class BlogCategoryOut(Schema):
    id: str
    name: str
    slug: str
    description: str = ''
    icon: str = '📝'
    post_count: int = 0


class BlogPostIn(Schema):
    title: str
    content: str
    excerpt: str = ''
    cover_image: str = ''
    category_id: Optional[str] = None
    tags: str = ''
    is_featured: bool = False
    is_published: bool = False


class BlogPostOut(Schema):
    id: str
    title: str
    slug: str
    content: str
    excerpt: str
    cover_image: str
    category: Optional[BlogCategoryOut] = None
    author: dict
    tags: str
    tag_list: List[str] = []
    reading_time: int
    view_count: int
    likes_count: int
    saves_count: int
    flags_count: int = 0                  # ← NEW
    is_liked: bool = False
    is_saved: bool = False
    is_flagged: bool = False             # ← NEW
    is_featured: bool = False
    is_published: bool = False
    is_hidden: bool = False
    published_at: Optional[datetime] = None
    created_at: datetime


class BlogPostListOut(Schema):
    id: str
    title: str
    slug: str
    excerpt: str
    cover_image: str
    category: Optional[BlogCategoryOut] = None
    author: dict
    tags: str
    reading_time: int
    view_count: int
    likes_count: int
    saves_count: int
    flags_count: int = 0                  # ← NEW
    is_liked: bool = False
    is_saved: bool = False
    is_flagged: bool = False             # ← NEW
    is_featured: bool = False
    is_hidden: bool = False
    published_at: Optional[datetime] = None


class CommentIn(Schema):
    body: str
    parent_id: Optional[str] = None


class CommentOut(Schema):
    id: str
    body: str
    user: dict
    parent_id: Optional[str] = None
    created_at: datetime
    replies: List['CommentOut'] = []
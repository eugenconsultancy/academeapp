import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogApi } from '../api/blogApi';
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit3, FiTrash2, FiArrowRight, FiBookOpen,
} from 'react-icons/fi';

export default function MyBlogPostsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: posts, isLoading } = useQuery({
        queryKey: ['my-blog-posts', user?.id],
        queryFn: async () => {
            const response = await blogApi.getMyPosts(); // Ensure this API exists
            return response.data || response;
        },
        enabled: !!user,
    });

    const deleteMutation = useMutation({
        mutationFn: (postId) => blogApi.deletePost(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-blog-posts'] });
            toast.success('Post deleted');
        },
        onError: () => toast.error('Failed to delete post'),
    });

    const handleDelete = (id) => {
        if (window.confirm('Delete this post?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Blog Posts</h1>
                    <Link
                        to="/blog/create"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md"
                    >
                        <FiPlus className="w-4 h-4" /> New Post
                    </Link>
                </div>

                {isLoading ? (
                    <SkeletonLoader type="list" count={4} />
                ) : posts?.length ? (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex justify-between items-center">
                                <div>
                                    <Link to={`/blog/${post.slug}`} className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                                        {post.title}
                                    </Link>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{new Date(post.published_at).toLocaleDateString()}</span>
                                        <span>{post.reading_time} min read</span>
                                        <span>{post.likes_count || 0} likes</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/blog/${post.slug}/edit`}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                        title="Edit"
                                    >
                                        <FiEdit3 className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        title="Delete"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <FiBookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't written any posts yet.</p>
                        <Link to="/blog/create" className="inline-flex items-center gap-2 mt-4 text-blue-500 hover:text-blue-600 font-semibold">
                            Write your first post <FiArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
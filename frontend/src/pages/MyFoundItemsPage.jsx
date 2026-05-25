import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foundItemsApi } from '../api/foundItemsApi'; // adjust import as needed
import { useAuth } from '../contexts/AuthContext';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit3, FiTrash2, FiPackage, FiArrowRight,
} from 'react-icons/fi';

export default function MyFoundItemsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: items, isLoading } = useQuery({
        queryKey: ['my-found-items', user?.id],
        queryFn: async () => {
            const response = await foundItemsApi.getMyItems(); // must be implemented
            return response.data || response;
        },
        enabled: !!user,
    });

    const deleteMutation = useMutation({
        mutationFn: (itemId) => foundItemsApi.deleteItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-found-items'] });
            toast.success('Item deleted');
        },
        onError: () => toast.error('Failed to delete item'),
    });

    const handleDelete = (id) => {
        if (window.confirm('Delete this item?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Listings</h1>
                    <Link
                        to="/found-items/post"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md"
                    >
                        <FiPlus className="w-4 h-4" /> Post New Item
                    </Link>
                </div>

                {isLoading ? (
                    <SkeletonLoader type="list" count={4} />
                ) : items?.length ? (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex justify-between items-center">
                                <div>
                                    <Link to={`/found-items/${item.id}`} className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                                        {item.item_name}
                                    </Link>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description?.substring(0, 80)}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                        <span>{item.is_claimed ? 'Claimed' : 'Unclaimed'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/found-items/${item.id}/edit`} // assuming an edit page exists
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                        title="Edit"
                                    >
                                        <FiEdit3 className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(item.id)}
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
                        <FiPackage className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't posted any found items yet.</p>
                        <Link to="/found-items/post" className="inline-flex items-center gap-2 mt-4 text-blue-500 hover:text-blue-600 font-semibold">
                            Post a found item <FiArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { announcementsApi } from '../api/announcementsApi';
import { opportunitiesApi } from '../api/opportunitiesApi';
import { blogApi } from '../api/blogApi';
import { useQuery } from '@tanstack/react-query';
import SkeletonLoader from '../components/shared/SkeletonLoader';
import { FiSearch, FiFileText, FiBriefcase, FiBookOpen } from 'react-icons/fi';

export default function SearchResultsPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';

    const { data: results, isLoading } = useQuery({
        queryKey: ['search', query],
        queryFn: async () => {
            if (!query.trim()) return { announcements: [], opportunities: [], blogPosts: [] };
            const [annRes, oppRes, blogRes] = await Promise.all([
                announcementsApi.list({ search: query, limit: 5 }),
                opportunitiesApi.list({ search: query, limit: 5 }),
                blogApi.listPosts({ search: query, limit: 5 }),
            ]);
            return {
                announcements: annRes.data || annRes,
                opportunities: oppRes.data || oppRes,
                blogPosts: blogRes.data || blogRes,
            };
        },
        enabled: !!query,
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    <FiSearch className="inline mr-2" /> Search Results
                </h1>
                {query && <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Showing results for “{query}”</p>}

                {isLoading ? (
                    <SkeletonLoader type="list" count={6} />
                ) : !query ? (
                    <div className="text-center py-16">
                        <FiSearch className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Enter a search term to find content.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Announcements */}
                        <section>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                <FiFileText className="w-5 h-5 text-blue-500" /> Announcements
                            </h2>
                            {results?.announcements?.length ? (
                                results.announcements.map((a) => (
                                    <Link key={a.id} to={`/announcements/${a.id}`} className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-2 hover:shadow-md transition-shadow">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{a.content}</p>
                                    </Link>
                                ))
                            ) : <p className="text-sm text-gray-400">No announcements found.</p>}
                        </section>

                        {/* Opportunities */}
                        <section>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                <FiBriefcase className="w-5 h-5 text-green-500" /> Opportunities
                            </h2>
                            {results?.opportunities?.length ? (
                                results.opportunities.map((o) => (
                                    <Link key={o.id} to={`/opportunities/${o.id}`} className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-2 hover:shadow-md transition-shadow">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{o.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{o.description}</p>
                                    </Link>
                                ))
                            ) : <p className="text-sm text-gray-400">No opportunities found.</p>}
                        </section>

                        {/* Blog Posts */}
                        <section>
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                <FiBookOpen className="w-5 h-5 text-purple-500" /> Blog Posts
                            </h2>
                            {results?.blogPosts?.length ? (
                                results.blogPosts.map((p) => (
                                    <Link key={p.id} to={`/blog/${p.slug}`} className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-2 hover:shadow-md transition-shadow">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{p.excerpt || p.content?.substring(0, 100)}</p>
                                    </Link>
                                ))
                            ) : <p className="text-sm text-gray-400">No blog posts found.</p>}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
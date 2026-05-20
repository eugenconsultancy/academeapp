import apiClient from './client';

export const searchApi = {
    unifiedSearch: (query, type) =>
        apiClient.get('/search/', { params: { q: query, type } }),
};
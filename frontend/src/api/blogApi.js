import apiClient from './client';

export const blogApi = {
  // Posts
  listPosts: async (params) => {
    const response = await apiClient.get('/blog/posts/', { params });
    return response.data;
  },
  getPost: async (slug) => {
    const response = await apiClient.get(`/blog/posts/${slug}/`);
    return response.data;
  },
  getFeatured: async () => {
    const response = await apiClient.get('/blog/featured/');
    return response.data;
  },
  getTrending: async () => {
    const response = await apiClient.get('/blog/trending/');
    return response.data;
  },

  // Admin
  createPost: async (data) => {
    const response = await apiClient.post('/blog/posts/', data);
    return response.data;
  },
  updatePost: async (id, data) => {
    const response = await apiClient.put(`/blog/posts/${id}/edit/`, data);
    return response.data;
  },
  deletePost: async (id) => {
    const response = await apiClient.delete(`/blog/posts/${id}/`);
    return response.data;
  },

  // Interactions
  toggleLike: async (postId) => {
    const response = await apiClient.post(`/blog/posts/${postId}/like/`);
    return response.data;
  },
  toggleSave: async (postId) => {
    const response = await apiClient.post(`/blog/posts/${postId}/save/`);
    return response.data;
  },
  getSavedPosts: async () => {
    const response = await apiClient.get('/blog/saved/');
    return response.data;
  },

  // Categories
  listCategories: async () => {
    const response = await apiClient.get('/blog/categories/');
    return response.data;
  },

  // Comments (these were outside the object – now correctly inside)
  listComments: async (postId) => {
    const response = await apiClient.get(`/blog/posts/${postId}/comments/`);
    return response.data;
  },
  createComment: async (postId, data) => {
    const response = await apiClient.post(`/blog/posts/${postId}/comments/`, data);
    return response.data;
  },
};

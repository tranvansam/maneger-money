export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip middleware on server as we'll handle auth check on client
  if (process.server) return;
  
  const { isAuthenticated, loading } = useAuth();
  
  // Wait for the authentication check to complete
  if (loading.value) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Short delay to ensure auth state is loaded
    await nextTick();
  }
  
  // If user is authenticated, redirect to dashboard
  if (isAuthenticated.value) {
    return navigateTo('/dashboard');
  }
}); 
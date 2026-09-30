// Signing up from a guest page brings new members straight to their route.
export const signUpPath = '/login?next=%2Fpath';

// The login page's chunk loads while the pointer or focus is on its way, so it opens at once.
export const preloadLogin = () => { void import('../../pages/auth/LoginPage'); };

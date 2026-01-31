import { useState, useCallback } from 'react';

// Types
type MainView = 'myList' | 'search' | 'follow' | 'admin' | 'users' | 'settings';
type UsersSubView = 'search' | 'advanced';

interface NavigationState {
  currentView: MainView;
  usersSubView: UsersSubView;
  selectedUserId: number | null;
  navigationStack: MainView[];
}

interface UseNavigationReturn {
  currentView: MainView;
  usersSubView: UsersSubView;
  selectedUserId: number | null;
  navigateToView: (view: MainView) => void;
  viewUser: (userId: number) => void;
  backFromProfile: () => void;
  setUsersSubView: (subView: UsersSubView) => void;
  canGoBack: boolean;
}

/**
 * Custom hook for managing application navigation state
 * 
 * Features:
 * - Simple navigation stack for back functionality
 * - User profile navigation with context preservation
 * - Sub-view management for Users section
 */
export function useNavigation(): UseNavigationReturn {
  const [state, setState] = useState<NavigationState>({
    currentView: 'myList',
    usersSubView: 'search',
    selectedUserId: null,
    navigationStack: [],
  });

  /**
   * Navigate to a main view
   */
  const navigateToView = useCallback((view: MainView) => {
    setState(prev => ({
      ...prev,
      currentView: view,
      selectedUserId: null,
      // Don't add to stack if it's the same view
      navigationStack: prev.currentView === view 
        ? prev.navigationStack 
        : [...prev.navigationStack, prev.currentView],
    }));
  }, []);

  /**
   * Navigate to a user profile
   */
  const viewUser = useCallback((userId: number) => {
    setState(prev => ({
      ...prev,
      selectedUserId: userId,
      // Save current view to stack if not already viewing users
      navigationStack: prev.currentView === 'users' && prev.selectedUserId === null
        ? prev.navigationStack
        : [...prev.navigationStack, prev.currentView],
      currentView: 'users',
    }));
  }, []);

  /**
   * Go back from user profile
   */
  const backFromProfile = useCallback(() => {
    setState(prev => {
      const newStack = [...prev.navigationStack];
      const previousView = newStack.pop() || 'users';
      
      return {
        ...prev,
        selectedUserId: null,
        currentView: previousView as MainView,
        navigationStack: newStack,
      };
    });
  }, []);

  /**
   * Change users sub-view
   */
  const setUsersSubView = useCallback((subView: UsersSubView) => {
    setState(prev => ({
      ...prev,
      usersSubView: subView,
    }));
  }, []);

  return {
    currentView: state.currentView,
    usersSubView: state.usersSubView,
    selectedUserId: state.selectedUserId,
    navigateToView,
    viewUser,
    backFromProfile,
    setUsersSubView,
    canGoBack: state.navigationStack.length > 0,
  };
}

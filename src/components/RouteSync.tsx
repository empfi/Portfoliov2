"use client";
import { useEffect, useRef } from 'react';
import { useFocus } from '@/context/FocusContext';

const PROJECTS = ['hyperplex', 'luakey', 'minedock', 'bloxvault', 'neutrabots'];

export default function RouteSync() {
  const { focusedItem, setFocusedItem } = useFocus();
  const isInitialLoad = useRef(true);

  // Sync URL -> State on initial mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/project/')) {
      const projectName = path.replace('/project/', '');
      if (focusedItem !== projectName && PROJECTS.includes(projectName)) {
        setFocusedItem(projectName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/project/')) {
        const pName = path.replace('/project/', '');
        setFocusedItem(PROJECTS.includes(pName) ? pName : null);
      } else {
        setFocusedItem(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setFocusedItem]);

  // Sync State -> URL when user clicks objects
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    
    const currentPath = window.location.pathname;
    if (focusedItem && PROJECTS.includes(focusedItem)) {
      const targetPath = `/project/${focusedItem}`;
      if (currentPath !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    } else {
      if (currentPath !== '/') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [focusedItem]);

  return null;
}

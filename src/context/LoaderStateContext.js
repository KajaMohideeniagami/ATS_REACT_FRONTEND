import { createContext } from 'react';

const LoaderStateContext = createContext({
  isVisible: false,
  showLoader: () => {},
  hideLoader: () => {},
  activeRequests: 0,
  aiIsVisible: false,
  showAiLoader: () => {},
  hideAiLoader: () => {},
});

export default LoaderStateContext;

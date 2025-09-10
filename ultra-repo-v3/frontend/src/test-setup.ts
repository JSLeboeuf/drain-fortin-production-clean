import '@testing-library/jest-dom';

// Add custom matchers for testing
declare global {
  namespace Vi {
    interface Assertion {
      toBeInTheDocument(): void;
    }
  }
}
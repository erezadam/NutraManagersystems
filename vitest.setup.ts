import '@testing-library/jest-dom';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom does not provide ResizeObserver by default.
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

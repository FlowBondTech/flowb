// Web polyfill for react-native-screens
// This file provides a CommonJS-compatible export for React Navigation

const React = require('react');
const { View } = require('react-native');

// All screen components are replaced with View on web
const Screen = View;
const ScreenContainer = View;
const NativeScreenContainer = View;
const ScreenStack = View;
const ScreenStackItem = View;
const ScreenStackHeaderConfig = View;
const ScreenStackHeaderSubview = View;
const ScreenStackHeaderLeftView = View;
const ScreenStackHeaderCenterView = View;
const ScreenStackHeaderRightView = View;
const ScreenStackHeaderBackButtonImage = View;
const ScreenStackHeaderSearchBarView = View;
const SearchBar = View;
const FullWindowOverlay = View;
const ScreenFooter = View;
const ScreenContentWrapper = View;
const InnerScreen = View;

// Context
const ScreenContext = React.createContext(null);

// Functions
const enableScreens = () => {};
const enableFreeze = () => {};
const screensEnabled = () => false;
const freezeEnabled = () => false;
const isSearchBarAvailableForCurrentPlatform = () => false;
const executeNativeBackPress = () => false;

// Compatibility flags
const compatibilityFlags = {
  isNewBackTitleImplementation: false,
};

// Hooks
const useTransitionProgress = () => ({
  progress: { value: 1 },
  closing: { value: 0 },
  goingForward: { value: 0 },
});

// Export everything as module properties for CommonJS compatibility
module.exports = {
  Screen,
  ScreenContainer,
  NativeScreenContainer,
  ScreenStack,
  ScreenStackItem,
  ScreenStackHeaderConfig,
  ScreenStackHeaderSubview,
  ScreenStackHeaderLeftView,
  ScreenStackHeaderCenterView,
  ScreenStackHeaderRightView,
  ScreenStackHeaderBackButtonImage,
  ScreenStackHeaderSearchBarView,
  SearchBar,
  FullWindowOverlay,
  ScreenFooter,
  ScreenContentWrapper,
  InnerScreen,
  ScreenContext,
  enableScreens,
  enableFreeze,
  screensEnabled,
  freezeEnabled,
  isSearchBarAvailableForCurrentPlatform,
  executeNativeBackPress,
  compatibilityFlags,
  useTransitionProgress,
  default: Screen,
};

// Also add all properties directly to the module.exports for maximum compatibility
Object.assign(module.exports, {
  shouldUseActivityState: false,
  ScreenStackAnimation: {
    default: 'default',
    fade: 'fade',
    flip: 'flip',
    none: 'none',
    simple_push: 'simple_push',
    slide_from_right: 'slide_from_right',
    slide_from_left: 'slide_from_left',
    slide_from_bottom: 'slide_from_bottom',
    fade_from_bottom: 'fade_from_bottom',
  },
  ScreenStackHeaderSubviewType: {
    back: 'back',
    center: 'center',
    left: 'left',
    right: 'right',
    searchBar: 'searchBar',
  },
  ScreenReplaceTypes: {
    push: 'push',
    pop: 'pop',
  },
  ScreenOrientation: {
    default: 'default',
    all: 'all',
    portrait: 'portrait',
    portrait_up: 'portrait_up',
    portrait_down: 'portrait_down',
    landscape: 'landscape',
    landscape_left: 'landscape_left',
    landscape_right: 'landscape_right',
  },
});
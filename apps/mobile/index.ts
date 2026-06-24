// Must be the very first import — polyfills crypto.getRandomValues, which Hermes/React Native
// doesn't provide natively. Needed before anything else (including App.tsx's encryption setup)
// has a chance to run.
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

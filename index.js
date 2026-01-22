import { registerRootComponent } from 'expo';
// Import backgroundService early to register background tasks
import './src/services/backgroundService';
import App from './App';

registerRootComponent(App);


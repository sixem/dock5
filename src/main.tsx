// App entrypoint. Keeps wiring minimal and obvious.
import { render } from 'preact';

import { App } from './app/App';
import './app/styles/index.css';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app element');
}

render(<App />, root);

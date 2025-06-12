import { render } from 'preact';
import { Popup } from '../components/Popup';
import '../styles/main.scss';

const root = document.getElementById('root');
if (root) {
  render(<Popup />, root);
}

import ReactDOM from 'react-dom/client';
import { initSupabaseAuth, watchAuthChanges } from './lib/auth';
import { MainAppWithAuth } from './app/main/MainAppWithAuth';
import { applyCachedThemeToDocument } from './features/themes/theme-store';
import './styles/globals.css';
import { NativeDialogHost } from './components/ui/native-dialog';

document.body.dataset.surface = 'main';
applyCachedThemeToDocument();

async function bootstrap() {
  try {
    await initSupabaseAuth();
    watchAuthChanges();
  } catch (error) {
    console.error('Failed to initialize auth:', error);
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <><MainAppWithAuth /><NativeDialogHost /></>,
  );
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
});

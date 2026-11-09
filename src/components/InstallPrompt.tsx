import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { isIOS, isStandalone, useInstallPrompt } from '../lib/pwa';
import { Icon } from './Icon';

export function InstallPrompt() {
  const { settings, updateSettings, ready } = useApp();
  const { canPrompt, prompt } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const ios = typeof navigator !== 'undefined' && isIOS();

  useEffect(() => {
    if (!ready || settings.installDismissed || isStandalone()) return;
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [ready, settings.installDismissed]);

  if (!visible || settings.installDismissed || (!canPrompt && !ios)) return null;

  const dismiss = () => {
    setVisible(false);
    void updateSettings({ installDismissed: true });
  };

  return (
    <div className="card install-card fade-in" role="dialog" aria-label="Instalar la aplicación">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="card-icon" style={{ marginBottom: 0 }}>
          <Icon name="install" />
        </span>
        <div style={{ flex: 1 }}>
          <strong>Ten tu espacio a mano</strong>
          {ios ? (
            <p className="small muted" style={{ margin: '0.25rem 0 0' }}>
              En Safari, toca <Icon name="share" size={16} /> <strong>Compartir</strong> y luego <strong>“Añadir a pantalla de inicio”</strong>.
            </p>
          ) : (
            <p className="small muted" style={{ margin: '0.25rem 0 0' }}>
              Instala la app para abrirla más rápido y usar la pausa incluso sin conexión.
            </p>
          )}
        </div>
        <button type="button" className="icon-btn" aria-label="Cerrar" onClick={dismiss}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {!ios && (
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: '0.75rem' }}
          onClick={async () => {
            await prompt();
            dismiss();
          }}
        >
          Instalar
        </button>
      )}
    </div>
  );
}

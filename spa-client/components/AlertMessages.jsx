import { useApp } from '../context/AppContext';

export default function AlertMessages() {
  const { error, info } = useApp();

  return (
    <>
      {error && <p className="alert alert--error">{error}</p>}
      {info && <p className="alert alert--info">{info}</p>}
    </>
  );
}

import React, { useContext } from 'react';
import '../../global.css';
import LoaderStateContext from '../../context/LoaderStateContext';

const Loader = ({
  message = 'Loading...',
  size = 'lg',
  backdrop = false,
  fullscreen = false,
  inline = false,
  className = '',
  suppressWhenGlobal = true,
}) => {
  const { isVisible: isGlobalLoaderVisible } = useContext(LoaderStateContext);

  const wrapperClassName = [
    'ats-loader',
    backdrop ? 'ats-loader-backdrop' : '',
    fullscreen ? 'ats-loader-fullscreen' : '',
    inline ? 'ats-loader-inline' : '',
    className,
  ].filter(Boolean).join(' ');

  if (!fullscreen && suppressWhenGlobal && isGlobalLoaderVisible) {
    return null;
  }

  return (
    <div className={wrapperClassName} aria-live="polite" aria-busy="true">
      <div className={`ats-loader-spinner ats-loader-spinner-${size}`} />
      {message ? <div className="ats-loader-message">{message}</div> : null}
    </div>
  );
};

export default Loader;

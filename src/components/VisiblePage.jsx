import React from "react";

const VisiblePage = React.memo(({children}) => {
  const [isHidden, setHidden] = React.useState(document.hidden);

  const handleVisibilityChange = React.useCallback(() => {
    setHidden(document.hidden);
  }, []);

  React.useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  if (isHidden) return null;

  return (
    children
  );
});

export default VisiblePage;
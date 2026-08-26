import { Helmet } from '@dr.pogodin/react-helmet';
import { type ReactElement } from 'react';

interface RootLayoutProps {
  children: ReactElement;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Helmet>
        <title>Intern Break Space</title>
        <meta name="description" content="The intern break space — challenges, games, and leaderboards for your internship program." />
      </Helmet>
      {children}
    </>
  );
}

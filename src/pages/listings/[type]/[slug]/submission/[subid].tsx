import type { GetServerSideProps } from 'next';

const Sumbissions = () => {
  return null;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { subid } = context.query;

  if (typeof subid !== 'string') {
    return {
      redirect: {
        destination: '/feed',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: `/feed/submission/${subid}`,
      permanent: false,
    },
  };
};

export default Sumbissions;

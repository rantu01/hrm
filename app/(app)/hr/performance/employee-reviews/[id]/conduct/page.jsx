import ConductReviewClient from './conduct-client';

export default async function ConductReviewPage({ params }) {
  const { id } = await params;
  return <ConductReviewClient id={id} />;
}

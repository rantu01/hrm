import ShowReviewClient from './show-client';

export default async function EmployeeReviewDetailPage({ params }) {
  const { id } = await params;
  return <ShowReviewClient id={id} />;
}

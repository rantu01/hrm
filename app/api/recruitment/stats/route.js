import connectDB from '@/lib/db';
import JobPosting from '@/lib/models/JobPosting';
import Candidate from '@/lib/models/Candidate';
import Interview from '@/lib/models/Interview';
import Offer from '@/lib/models/Offer';
import CandidateOnboarding from '@/lib/models/CandidateOnboarding';
import { handleApiError } from '@/lib/auth';
import { authorizeRecruitment, buildStatusCounts } from '@/lib/recruitment-server';
import {
  CANDIDATE_STATUSES,
  INTERVIEW_STATUSES,
  JOB_STATUSES,
  OFFER_STATUSES,
  ONBOARDING_STATUSES,
} from '@/lib/recruitment';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// @route   GET /api/recruitment/stats
// @desc    Real recruitment metrics for the overview page
// @access  Private (view-recruitment)
export async function GET(request) {
  try {
    await authorizeRecruitment(request, 'view-recruitment');
    await connectDB();
    const today = startOfToday();

    const [
      jobTotal,
      jobAgg,
      publishedJobs,
      candidateTotal,
      candidateAgg,
      hiredCount,
      convertedCount,
      interviewTotal,
      interviewAgg,
      upcomingCount,
      pendingFeedbackCount,
      offerTotal,
      offerAgg,
      acceptedCount,
      onboardingTotal,
      onboardingAgg,
      activeJobPostingsRaw,
      recentCandidatesRaw,
      upcomingInterviewsRaw,
    ] = await Promise.all([
      JobPosting.countDocuments({}),
      JobPosting.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      JobPosting.countDocuments({ is_published: true }),
      Candidate.countDocuments({}),
      Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Candidate.countDocuments({ status: 'Hired' }),
      Candidate.countDocuments({ is_employee: true }),
      Interview.countDocuments({}),
      Interview.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Interview.countDocuments({ status: 'Scheduled', scheduled_date: { $gte: today } }),
      Interview.countDocuments({ feedback_submitted: false }),
      Offer.countDocuments({}),
      Offer.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Offer.countDocuments({ status: 'Accepted' }),
      CandidateOnboarding.countDocuments({}),
      CandidateOnboarding.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      JobPosting.find({ status: 'Published' })
        .select('title job_code application_deadline createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Candidate.find({})
        .select('first_name last_name status application_date job_id')
        .populate('job_id', 'title job_code')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Interview.find({ status: 'Scheduled', scheduled_date: { $gte: today } })
        .select('scheduled_date scheduled_time duration status candidate_id job_id')
        .populate('candidate_id', 'first_name last_name')
        .populate('job_id', 'title')
        .sort({ scheduled_date: 1 })
        .limit(5)
        .lean(),
    ]);

    const activeJobIds = activeJobPostingsRaw.map((j) => j._id);
    const applicantCounts = activeJobIds.length
      ? await Candidate.aggregate([
          { $match: { job_id: { $in: activeJobIds } } },
          { $group: { _id: '$job_id', applicants: { $sum: 1 } } },
        ])
      : [];
    const applicantMap = Object.fromEntries(applicantCounts.map((a) => [String(a._id), a.applicants]));

    const jobByStatus = buildStatusCounts(jobAgg, JOB_STATUSES);
    const candidateByStatus = buildStatusCounts(candidateAgg, CANDIDATE_STATUSES);
    const interviewByStatus = buildStatusCounts(interviewAgg, INTERVIEW_STATUSES);
    const offerByStatus = buildStatusCounts(offerAgg, OFFER_STATUSES);
    const onboardingByStatus = buildStatusCounts(onboardingAgg, ONBOARDING_STATUSES);

    return Response.json(
      {
        jobPostings: {
          total: jobTotal,
          byStatus: jobByStatus,
          published: publishedJobs,
        },
        candidates: {
          total: candidateTotal,
          byStatus: candidateByStatus,
          hired: hiredCount,
          converted: convertedCount,
        },
        interviews: {
          total: interviewTotal,
          byStatus: interviewByStatus,
          upcoming: upcomingCount,
          pendingFeedback: pendingFeedbackCount,
        },
        offers: {
          total: offerTotal,
          byStatus: offerByStatus,
          accepted: acceptedCount,
        },
        onboarding: {
          total: onboardingTotal,
          byStatus: onboardingByStatus,
        },
        activeJobPostings: activeJobPostingsRaw.map((job) => ({
          _id: job._id,
          title: job.title,
          job_code: job.job_code,
          application_deadline: job.application_deadline,
          applicants: applicantMap[String(job._id)] || 0,
        })),
        recentCandidates: recentCandidatesRaw.map((c) => ({
          _id: c._id,
          name: [c.first_name, c.last_name].filter(Boolean).join(' '),
          status: c.status,
          application_date: c.application_date,
          jobTitle: c.job_id?.title || null,
        })),
        upcomingInterviews: upcomingInterviewsRaw.map((i) => ({
          _id: i._id,
          candidateName: [i.candidate_id?.first_name, i.candidate_id?.last_name].filter(Boolean).join(' '),
          jobTitle: i.job_id?.title || null,
          scheduled_date: i.scheduled_date,
          scheduled_time: i.scheduled_time,
          duration: i.duration,
          status: i.status,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, 'Server error fetching recruitment statistics');
  }
}

import type { JobRecord } from "../../shared/types";

interface JobQueuePanelProps {
  jobs: JobRecord[];
}

export function JobQueuePanel({ jobs }: JobQueuePanelProps): JSX.Element {
  const visibleJobs = jobs.slice(0, 8);

  return (
    <section className="job-panel">
      <header>
        <h3>Activity</h3>
        <p>Imports and exports update in real-time.</p>
      </header>

      {visibleJobs.length === 0 ? (
        <div className="status-card">No jobs yet</div>
      ) : (
        <ul className="job-list">
          {visibleJobs.map((job) => {
            const pct = job.progressTotal === 0 ? 0 : Math.floor((job.progressCurrent / job.progressTotal) * 100);
            return (
              <li key={job.id} className={`job-item status-${job.status}`}>
                <div className="job-row">
                  <span>{job.type.toUpperCase()}</span>
                  <span>{job.status}</span>
                </div>
                <div className="job-message">{job.message ?? "Waiting..."}</div>
                <div className="job-progress-track">
                  <div className="job-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

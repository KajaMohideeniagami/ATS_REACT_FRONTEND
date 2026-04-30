import React from 'react';
import { Database, Merge } from 'lucide-react';
import CandidateDatabasePage from '../CandidateDatabase/CandidateDatabasePage';
import ProfileMergePage from '../ProfileMerge/ProfileMergePage';

const CandidateWorkspacePage = () => {
  return (
    <div className="candidate-workspace-page">
      <div className="candidate-workspace-shell">
        <div className="candidate-workspace-header">
          <div className="header-title-wrapper">
            <Database className="header-icon" size={36} strokeWidth={1.5} />
            <div>
              <h1 className="ats-heading-1">Candidate Workspace</h1>
              <p className="ats-body-small">
                Search, review, download, upload, and merge candidate profiles from one unified workspace.
              </p>
            </div>
          </div>
        </div>

        <section className="candidate-workspace-section">
          <div className="candidate-workspace-section-head">
            <Database size={20} />
            <h2 className="ats-heading-2">Candidate Database</h2>
          </div>
          <CandidateDatabasePage embedded />
        </section>

        <section className="candidate-workspace-section">
          <div className="candidate-workspace-section-head">
            <Merge size={20} />
            <h2 className="ats-heading-2">Profile Merge & Upload</h2>
          </div>
          <ProfileMergePage embedded />
        </section>
      </div>
    </div>
  );
};

export default CandidateWorkspacePage;

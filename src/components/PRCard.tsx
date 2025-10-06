import React from 'react'
import { PullRequest } from '../types'

interface PRCardProps {
  pr: PullRequest
}

export const PRCard: React.FC<PRCardProps> = ({ pr }) => {
  const getStatusColor = (pr: PullRequest) => {
    if (pr.draft) return '#6b7280' // gray
    if (pr.review_decision === 'APPROVED') return '#10b981' // green
    if (pr.review_decision === 'CHANGES_REQUESTED') return '#f59e0b' // yellow
    return '#3b82f6' // blue
  }

  const getStatusText = (pr: PullRequest) => {
    if (pr.draft) return 'Draft'
    if (pr.review_decision === 'APPROVED') return 'Approved'
    if (pr.review_decision === 'CHANGES_REQUESTED') return 'Changes Requested'
    return 'Ready for Review'
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
          <a href={pr.html_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            {pr.title}
          </a>
        </h3>
        <span style={{
          backgroundColor: getStatusColor(pr),
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {getStatusText(pr)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <img
          src={pr.user?.avatar_url || ''}
          alt={pr.user?.login || 'Unknown'}
          style={{ width: '20px', height: '20px', borderRadius: '50%' }}
        />
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          {pr.user?.login || 'Unknown'} • {pr.repository?.name || 'Unknown'}
        </span>
      </div>

      {pr.assignees && pr.assignees.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Assigned to:</span>
          {pr.assignees.map((assignee, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img
                src={assignee?.avatar_url || ''}
                alt={assignee?.login || 'Unknown'}
                style={{ width: '16px', height: '16px', borderRadius: '50%' }}
              />
              <span style={{ fontSize: '12px', color: '#374151' }}>{assignee?.login || 'Unknown'}</span>
            </div>
          ))}
        </div>
      )}

      {pr.requested_reviewers && pr.requested_reviewers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Reviewers:</span>
          {pr.requested_reviewers.map((reviewer, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <img
                src={reviewer?.avatar_url || ''}
                alt={reviewer?.login || 'Unknown'}
                style={{ width: '16px', height: '16px', borderRadius: '50%' }}
              />
              <span style={{ fontSize: '12px', color: '#374151' }}>{reviewer?.login || 'Unknown'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

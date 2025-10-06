import React from 'react'
import { PullRequest } from '../types'

interface StatsBarProps {
  prs: PullRequest[]
}

export const StatsBar: React.FC<StatsBarProps> = ({ prs }) => {
  const draftCount = prs.filter(pr => pr.draft).length
  const readyCount = prs.filter(pr => !pr.draft && pr.review_decision !== 'APPROVED' && pr.review_decision !== 'CHANGES_REQUESTED').length
  const approvedCount = prs.filter(pr => pr.review_decision === 'APPROVED').length
  const changesCount = prs.filter(pr => pr.review_decision === 'CHANGES_REQUESTED').length

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>{draftCount}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Draft</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{readyCount}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Ready for Review</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{approvedCount}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Approved</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{changesCount}</div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Changes Requested</div>
      </div>
    </div>
  )
}

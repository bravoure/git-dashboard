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
    <div className="flex gap-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-500">{draftCount}</div>
        <div className="text-sm text-gray-500">Draft</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-500">{readyCount}</div>
        <div className="text-sm text-gray-500">Ready for Review</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-500">{approvedCount}</div>
        <div className="text-sm text-gray-500">Approved</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-amber-500">{changesCount}</div>
        <div className="text-sm text-gray-500">Changes Requested</div>
      </div>
    </div>
  )
}

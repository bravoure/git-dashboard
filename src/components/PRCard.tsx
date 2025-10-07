import React from 'react'
import { PullRequest } from '../types'

interface PRCardProps {
  pr: PullRequest
}

export const PRCard: React.FC<PRCardProps> = ({ pr }) => {
  const getStatusColor = (pr: PullRequest) => {
    if (pr.draft) return 'bg-gray-500'
    if (pr.review_decision === 'APPROVED') return 'bg-emerald-500'
    if (pr.review_decision === 'CHANGES_REQUESTED') return 'bg-amber-500'
    return 'bg-blue-500'
  }

  const getStatusText = (pr: PullRequest) => {
    if (pr.draft) return 'Draft'
    if (pr.review_decision === 'APPROVED') return 'Approved'
    if (pr.review_decision === 'CHANGES_REQUESTED') return 'Changes Requested'
    return 'Ready for Review'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="m-0 text-base font-semibold text-gray-800">
          <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="no-underline text-inherit hover:text-blue-600">
            {pr.title}
          </a>
        </h3>
        <span className={`${getStatusColor(pr)} text-white px-2 py-1 rounded text-xs font-medium`}>
          {getStatusText(pr)}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <img
          src={pr.user?.avatar_url || ''}
          alt={pr.user?.login || 'Unknown'}
          className="w-5 h-5 rounded-full"
        />
        <span className="text-sm text-gray-500">
          {pr.user?.login || 'Unknown'} • {pr.repository?.name || 'Unknown'}
        </span>
      </div>

      {pr.assignees && pr.assignees.length > 0 && (
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs text-gray-500">Assigned to:</span>
          {pr.assignees.map((assignee, index) => (
            <div key={index} className="flex items-center gap-1">
              <img
                src={assignee?.avatar_url || ''}
                alt={assignee?.login || 'Unknown'}
                className="w-4 h-4 rounded-full"
              />
              <span className="text-xs text-gray-700">{assignee?.login || 'Unknown'}</span>
            </div>
          ))}
        </div>
      )}

      {pr.requested_reviewers && pr.requested_reviewers.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Reviewers:</span>
          {pr.requested_reviewers.map((reviewer, index) => (
            <div key={index} className="flex items-center gap-1">
              <img
                src={reviewer?.avatar_url || ''}
                alt={reviewer?.login || 'Unknown'}
                className="w-4 h-4 rounded-full"
              />
              <span className="text-xs text-gray-700">{reviewer?.login || 'Unknown'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

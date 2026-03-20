/**
 * Default template file contents
 * Written to {vault}/EmailKB/templates/ on first launch
 */

export const RESEARCH_FUND_APPROVAL = `# Template: Research Funding Request — Approval

## Purpose
Use when approving a student's or faculty member's request for research funding,
travel grants, or conference support.

## Key Information Points
1. Amount approved (or TBD pending college confirmation)
2. Purpose / event name
3. Submission deadline and required documents
4. Any conditions or constraints

## Example Structure
- Confirm approval in the first sentence
- State the amount and purpose
- List required next steps (reimbursement forms, receipts, etc.)
- Note any deadline
- Offer help with process questions

## Notes
- If exact amount is uncertain: "I'll need to confirm the final amount with the college"
- Include relevant department contacts for reimbursement processing
- Reimbursement typically requires: original receipts, completed expense report, program approval
`

export const RESEARCH_FUND_DENIAL = `# Template: Research Funding Request — Denial / Deferral

## Purpose
Use when denying or deferring a funding request due to budget constraints,
policy, or timing.

## Key Information Points
1. Clear statement that the request cannot be approved (this cycle)
2. Brief, honest reason (budget constraints, policy, timing)
3. Alternative options if any (other funds, next cycle, partial support)
4. Encouragement to try again / alternative path

## Example Structure
- State the decision directly in the first sentence
- Give the reason briefly
- Offer alternatives if available
- Encourage reapplication or suggest next steps

## Notes
- Do not over-apologize
- Be direct but warm
- "I'll need to confirm with the college" if the reason involves policy uncertainty
- Suggest the student check the Graduate College for external funding options
`

export const STUDENT_ADVISING_RESPONSE = `# Template: Student Advising Response

## Purpose
Use when responding to student inquiries about program requirements, course
selection, graduation timelines, or academic progress.

## Key Information Points
1. Direct answer to the student's specific question
2. Relevant program policy or requirement
3. Concrete next steps the student should take
4. Who else they may need to contact (if applicable)

## Example Structure
- Address the question directly in the first paragraph
- Reference specific program requirements or policies
- List concrete next steps (numbered or bulleted)
- Offer follow-up availability

## Language & Tone
- Match the student's preferred language from their contact profile
- If communicating in Chinese, use "同学" (classmate), never "您"
- Warm but clear and direct
- Encourage without being hollow

## Notes
- If policy is uncertain: "I'll need to confirm with the program office"
- Reference the student's specific situation when possible
- Refer to your program's course catalog for course details
`

export const FACULTY_SCHEDULING_REQUEST = `# Template: Faculty Course Scheduling Request

## Purpose
Use when coordinating course scheduling with faculty members — confirming
availability, assigning courses, or addressing conflicts.

## Key Information Points
1. Course name, section, and session (A/B/C)
2. Requested time slot or confirmed schedule
3. Any changes from previous semester
4. Deadline for confirmation

## Example Structure
- State the scheduling request or confirmation clearly
- List the course details (name, session, start/end dates)
- Note any changes or constraints from last term
- Request confirmation by a specific date

## Course Reference
- Reference your program's course catalog and scheduling details
- Check contact profiles for faculty teaching assignments
- Sessions may vary by term and institution

## Notes
- Confirm at least 6 weeks before session start
- Note any section size limits or special requirements
`

/**
 * Map of filename → content for all default template files
 */
export const DEFAULT_TEMPLATES: Record<string, string> = {
  'research-fund-approval.md': RESEARCH_FUND_APPROVAL,
  'research-fund-denial.md': RESEARCH_FUND_DENIAL,
  'student-advising-response.md': STUDENT_ADVISING_RESPONSE,
  'faculty-scheduling-request.md': FACULTY_SCHEDULING_REQUEST,
}

import type { TranslationKey, Translator } from "./core";

export const ERROR_CATALOG: Record<string, TranslationKey> = {
  "Exam not found.": "errors.examNotFound",
  "Course not found.": "errors.courseNotFound",
  "Course not found or unauthorized": "errors.courseNotFound",
  "Module not found or unauthorized": "errors.moduleNotFound",
  "Lesson not found or unauthorized": "errors.lessonNotFound",
  "Lesson not found.": "errors.lessonNotFound",
  "Material not found.": "errors.materialNotFound",
  "Attempt not found.": "errors.attemptNotFound",
  "Could not start attempt. Please try again.": "errors.actionFailed",
  "Enrollment could not be completed. Please try again.": "errors.actionFailed",
  "Exam is already archived.": "errors.examAlreadyArchived",
  "Exam is not currently published.": "errors.examNotPublished",
  "Only archived exams can be restored.": "errors.onlyArchivedRestorable",
  "Exams can only be edited while in draft status. Unpublish or restore the exam first.":
    "errors.examNotEditable",
  "Published exams cannot be permanently deleted. Unpublish or archive the exam instead.":
    "errors.examCannotDelete",
  "Published courses cannot be permanently deleted. Please archive the course instead to preserve student access history.":
    "errors.courseCannotDelete",
  "Attempt limit reached for this exam.": "errors.attemptLimitReached",
  "This attempt has already been submitted.": "errors.alreadySubmitted",
  "Exam not accessible.": "errors.examLocked",
  "Lesson not accessible.": "errors.lessonNotAccessible",
  "Material not accessible.": "errors.materialNotAccessible",
  "This course is not open for enrollment.": "errors.courseNotOpenForEnrollment",
  "This file type is not supported. Upload a PDF, image, Office document, text file, or ZIP archive.":
    "errors.invalidFileType",
  "The uploaded file is invalid.": "errors.invalidFile",
  "This file is too large. The maximum upload size is 25 MB.": "errors.fileTooLarge",
  "Upload failed. Please try again.": "errors.uploadFailed",
  "No file was uploaded.": "errors.noFileUploaded",
  "Failed to start the exam.": "errors.failedStartExam",
  "Failed to submit the exam.": "errors.failedSubmitExam",
  "Invalid course identifier.": "errors.invalidCourseId",
  "Invalid course identifier": "errors.invalidCourseId",
  "Invalid exam identifier.": "errors.invalidExamId",
  "Invalid lesson identifier.": "errors.invalidLessonId",
  "Invalid lesson identifier": "errors.invalidLessonId",
  "Invalid lesson data.": "errors.invalidLessonData",
  "Invalid submission data.": "errors.invalidSubmissionData",
  "Invalid module identifier": "errors.invalidModuleId",
  "Invalid reorder parameters": "errors.invalidReorder",
  "Invalid reorder parameters.": "errors.invalidReorder",
  "Invalid option identifier.": "errors.invalidOptionId",
  "Invalid question identifier.": "errors.invalidQuestionId",
  "Invalid question identifier": "errors.invalidQuestionId",
  "Invalid material identifier.": "errors.invalidMaterialId",
  "Invalid material data.": "errors.invalidMaterialData",
  "Validation failed. Please check the form errors.": "errors.validationFailed",
  "Validation failed for module data.": "errors.validationFailedModule",
  "Validation failed for lesson data.": "errors.validationFailedLesson",
  "Validation failed for question data.": "errors.validationFailedQuestion",
  "Validation failed for option data.": "errors.validationFailedOption",
  "Assignment not found.": "errors.assignmentNotFound",
  "Invalid assignment identifier.": "errors.assignmentNotFound",
  "Assignments can only be edited while in draft status. Unpublish or reopen the assignment first.":
    "errors.assignmentNotEditable",
  "Published assignments cannot be permanently deleted. Unpublish or close the assignment instead.":
    "errors.assignmentCannotDelete",
  "This assignment is closed and no longer accepts submissions.":
    "errors.assignmentClosed",
  "Submission not found.": "errors.submissionNotFound",
  "This submission has already been graded.": "errors.submissionAlreadyGraded",
  "Late submissions are not allowed for this assignment.": "errors.lateSubmissionsNotAllowed",
  "Only submitted work can be graded.": "errors.submissionNotGradeable",
  "Points are outside the allowed range for this assignment.": "errors.invalidPointsRange",
  "This file exceeds the maximum size allowed for this assignment.": "errors.assignmentFileTooLarge",
  "This file type is not allowed for this assignment.": "errors.assignmentFileTypeNotAllowed",
};

export function localizeMessage(message: string, t: Translator): string {
  const key = ERROR_CATALOG[message];
  return key ? t(key) : message;
}

export function localizeError(error: unknown, t: Translator): string {
  if (!(error instanceof Error)) {
    return t("errors.actionFailed");
  }
  const key = ERROR_CATALOG[error.message];
  if (key) {
    return t(key);
  }
  return error.message;
}
"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import type { Role } from "@/db/schema";
import { cn } from "@/lib/utils";
import {
  askQuestionAction,
  postAnswerAction,
  postCommentAction,
  voteAction,
  acceptAnswerAction,
  setStatusAction,
  pinThreadAction,
  deleteThreadAction,
} from "@/app/student/actions/qa-actions";

/**
 * R4 Doubt Q&A panel — replaces the legacy `LessonDiscussion` (Phase 8
 * flat comments) with a Stack-Overflow-style Q&A experience. Optimistic
 * updates via React's useTransition; final state is reconciled when the
 * server action revalidates the page.
 */

export type QaKind = "question" | "answer" | "comment" | "comment_legacy";
export type QaStatus = "open" | "resolved" | "closed" | "reopened";

export interface QaReplyView {
  id: string;
  kind: QaKind;
  content: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorRole: Role;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  pinned: boolean;
  status: QaStatus;
  createdAt: string;
  isAccepted: boolean;
  parentId: string | null;
  title: string | null;
}

export interface QaQuestionView extends QaReplyView {
  children: QaReplyView[];
}

interface QnaPanelProps {
  lessonId: string;
  courseId: string;
  currentUserId: string;
  currentUserRole: Role;
  initialQuestions: QaQuestionView[];
}

type Sort = "top" | "new" | "unanswered";
type Filter = "all" | "open" | "resolved" | "closed" | "mine";

export function QnaPanel(props: QnaPanelProps) {
  const { t } = useTranslations();
  const [sort, setSort] = useState<Sort>("top");
  const [filter, setFilter] = useState<Filter>("all");
  const [composeOpen, setComposeOpen] = useState(false);

  const questions = useMemo(() => applySortFilter(props.initialQuestions, sort, filter, props.currentUserId), [
    props.initialQuestions,
    sort,
    filter,
    props.currentUserId,
  ]);

  const counts = useMemo(() => {
    let open = 0;
    let resolved = 0;
    props.initialQuestions.forEach((q) => {
      if (q.status === "open") open += 1;
      else if (q.status === "resolved") resolved += 1;
    });
    return { open, resolved };
  }, [props.initialQuestions]);

  return (
    <section
      className="flex flex-col gap-6"
      aria-label={t("qna.tab.ask")}
      data-testid="qna-panel"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface">{t("qna.tab.ask")}</h2>
          <p className="mt-1 text-sm text-secondary">
            {t("qna.summary.openAndResolved", {
              open: counts.open,
              resolved: counts.resolved,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
        >
          {t("qna.actions.ask")}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-secondary">{t("qna.sort.label")}:</span>
          <SortButton active={sort === "top"} onClick={() => setSort("top")}>
            {t("qna.sort.top")}
          </SortButton>
          <SortButton active={sort === "new"} onClick={() => setSort("new")}>
            {t("qna.sort.new")}
          </SortButton>
          <SortButton active={sort === "unanswered"} onClick={() => setSort("unanswered")}>
            {t("qna.sort.unanswered")}
          </SortButton>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-secondary">{t("qna.filter.label")}:</span>
          <SortButton active={filter === "all"} onClick={() => setFilter("all")}>
            {t("qna.filter.all")}
          </SortButton>
          <SortButton
            active={filter === "mine"}
            onClick={() => setFilter("mine")}
            disabled={props.currentUserRole !== "student"}
          >
            {t("qna.filter.myQuestions")}
          </SortButton>
          <SortButton
            active={filter === "open"}
            onClick={() => setFilter("open")}
          >
            {t("qna.tab.open")}
          </SortButton>
          <SortButton
            active={filter === "resolved"}
            onClick={() => setFilter("resolved")}
          >
            {t("qna.tab.resolved")}
          </SortButton>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
          <p className="text-base font-semibold text-on-surface">
            {t("qna.empty.title")}
          </p>
          <p className="mt-1 text-sm text-secondary">
            {t("qna.empty.description")}
          </p>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container"
          >
            {t("qna.empty.cta")}
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {questions.map((q) => (
            <li key={q.id}>
              <QuestionCard
                question={q}
                courseId={props.courseId}
                currentUserId={props.currentUserId}
                currentUserRole={props.currentUserRole}
              />
            </li>
          ))}
        </ul>
      )}

      {composeOpen ? (
        <ComposeModal
          lessonId={props.lessonId}
          courseId={props.courseId}
          onClose={() => setComposeOpen(false)}
        />
      ) : null}
    </section>
  );
}

// ----------------------------------------------------------------------------

function SortButton({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary-container text-on-primary-container"
          : "bg-surface-container text-secondary hover:bg-surface-container-high",
        disabled && "opacity-50 cursor-not-allowed hover:bg-surface-container"
      )}
    >
      {children}
    </button>
  );
}

function applySortFilter(
  questions: QaQuestionView[],
  sort: Sort,
  filter: Filter,
  currentUserId: string
): QaQuestionView[] {
  let list = [...questions];
  if (filter === "open") list = list.filter((q) => q.status === "open");
  if (filter === "resolved") list = list.filter((q) => q.status === "resolved");
  if (filter === "closed") list = list.filter((q) => q.status === "closed");
  if (filter === "mine") list = list.filter((q) => q.authorId === currentUserId);

  if (sort === "new") {
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sort === "unanswered") {
    list = list.filter((q) => q.children.filter((c) => c.kind === "answer").length === 0);
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const sa = a.upvotes - a.downvotes;
      const sb = b.upvotes - b.downvotes;
      if (sa !== sb) return sb - sa;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const sa = a.upvotes - a.downvotes;
      const sb = b.upvotes - b.downvotes;
      if (sa !== sb) return sb - sa;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  return list;
}

// ----------------------------------------------------------------------------
// Question card
// ----------------------------------------------------------------------------

function QuestionCard({
  question,
  courseId,
  currentUserId,
  currentUserRole,
}: {
  question: QaQuestionView;
  courseId: string;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const { t, tn } = useTranslations();
  const [showAnswer, setShowAnswer] = useState(false);
  const isOwn = question.authorId === currentUserId;
  const isStaff = currentUserRole !== "student" && currentUserRole !== "parent";
  const canModerate = isStaff;
  const acceptedAnswer = question.children.find((c) => c.isAccepted);
  const otherAnswers = question.children.filter((c) => c.kind === "answer" && !c.isAccepted);
  const comments = question.children.filter((c) => c.kind === "comment");

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-surface-container-lowest p-5 shadow-xs",
        question.pinned ? "border-amber-200" : "border-outline-variant"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight text-on-surface">
            {question.title ?? question.content.slice(0, 80)}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant whitespace-pre-wrap">
            {question.content}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {question.pinned ? (
            <Badge tone="amber">{t("qna.meta.pinnedBadge")}</Badge>
          ) : null}
          {question.status === "resolved" ? (
            <Badge tone="emerald">{t("qna.meta.resolvedBadge")}</Badge>
          ) : null}
          {question.kind === "comment_legacy" ? (
            <Badge tone="muted">{t("qna.meta.legacyBadge")}</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-3 text-xs text-secondary">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(question.authorName ?? "U").charAt(0).toUpperCase()}
          </span>
          <span>
            {t("qna.meta.askedBy", { name: question.authorName ?? "Anonymous" })}
          </span>
          {question.authorRole === "teacher" ? (
            <Badge tone="indigo">{t("student.discussion.teacher")}</Badge>
          ) : null}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide text-outline">
          {new Date(question.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Vote row */}
      <div className="flex items-center justify-between gap-3">
        <VoteControl thread={question} courseId={courseId} currentUserId={currentUserId} />
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span>{tn("qna.meta.answerCount", question.children.filter((c) => c.kind === "answer").length, { count: question.children.filter((c) => c.kind === "answer").length })}</span>
          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            className="rounded-full border border-outline-variant px-3 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            {showAnswer ? "−" : "+"} {t("qna.actions.answer")}
          </button>
        </div>
      </div>

      {/* Accepted answer */}
      {acceptedAnswer ? (
        <AnswerCard
          answer={acceptedAnswer}
          isAccepted
          questionId={question.id}
          courseId={courseId}
          currentUserId={currentUserId}
          canAccept={isOwn || isStaff}
        />
      ) : null}

      {/* Other answers */}
      {otherAnswers.map((a) => (
        <AnswerCard
          key={a.id}
          answer={a}
          questionId={question.id}
          courseId={courseId}
          currentUserId={currentUserId}
          canAccept={isOwn || isStaff}
        />
      ))}

      {/* Compose answer inline */}
      {showAnswer ? (
        <AnswerComposer
          questionId={question.id}
          courseId={courseId}
          onClose={() => setShowAnswer(false)}
        />
      ) : null}

      {/* Comments */}
      {comments.length > 0 ? (
        <ul className="ml-2 flex flex-col gap-2 border-l-2 border-outline-variant pl-4">
          {comments.map((c) => (
            <li key={c.id} className="text-xs">
              <span className="font-semibold text-on-surface">
                {c.authorName ?? "User"}:
              </span>{" "}
              <span className="text-on-surface-variant whitespace-pre-wrap">
                {c.content}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Comment composer */}
      <CommentComposer
        parentId={question.id}
        courseId={courseId}
      />

      {/* Moderator actions */}
      {canModerate || isOwn ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3 text-xs">
          {canModerate ? (
            <ModeratorButton
              label={question.pinned ? t("qna.actions.unpin") : t("qna.actions.pin")}
              onClick={async () => {
                await pinThreadAction({
                  threadId: question.id,
                  pinned: !question.pinned,
                  courseId,
                });
              }}
            />
          ) : null}
          {isOwn ? (
            <ModeratorButton
              label={
                question.status === "resolved"
                  ? t("qna.actions.markOpen")
                  : t("qna.actions.markResolved")
              }
              onClick={async () => {
                await setStatusAction({
                  threadId: question.id,
                  status: question.status === "resolved" ? "open" : "resolved",
                  courseId,
                });
              }}
            />
          ) : null}
          {isOwn || canModerate ? (
            <ModeratorButton
              label={t("qna.actions.delete")}
              tone="danger"
              onClick={async () => {
                if (!confirm("Delete this thread?")) return;
                await deleteThreadAction({
                  threadId: question.id,
                  courseId,
                });
              }}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

// ----------------------------------------------------------------------------
// Answer card
// ----------------------------------------------------------------------------

function AnswerCard({
  answer,
  isAccepted,
  questionId,
  courseId,
  currentUserId,
  canAccept,
}: {
  answer: QaReplyView;
  isAccepted?: boolean;
  questionId: string;
  courseId: string;
  currentUserId: string;
  canAccept: boolean;
}) {
  const { t } = useTranslations();
  const isOwn = answer.authorId === currentUserId;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        isAccepted
          ? "border-emerald-300 bg-emerald-50/40"
          : "border-outline-variant bg-surface"
      )}
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {(answer.authorName ?? "U").charAt(0).toUpperCase()}
          </span>
          <span className="font-medium text-on-surface">
            {t("qna.meta.answeredBy", { name: answer.authorName ?? "Anonymous" })}
          </span>
          {answer.authorRole === "teacher" ? (
            <Badge tone="indigo">{t("student.discussion.teacher")}</Badge>
          ) : null}
          {isAccepted ? (
            <Badge tone="emerald">{t("qna.meta.acceptedBadge")}</Badge>
          ) : null}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide text-outline">
          {new Date(answer.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-on-surface whitespace-pre-wrap">
        {answer.content}
      </p>
      <div className="flex items-center justify-between gap-3">
        <VoteControl thread={answer} courseId={courseId} currentUserId={currentUserId} />
        {canAccept ? (
          <button
            type="button"
            onClick={async () => {
              await acceptAnswerAction({
                questionId,
                answerId: answer.id,
                courseId,
              });
            }}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              isAccepted
                ? "border border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                : "border border-outline-variant bg-surface text-on-surface-variant hover:border-primary hover:text-primary"
            )}
          >
            {isAccepted ? t("qna.actions.unacceptAnswer") : t("qna.actions.acceptAnswer")}
          </button>
        ) : null}
      </div>
      <CommentComposer parentId={answer.id} courseId={courseId} />
      {/* `isOwn` is read by future perms; keeping it explicit to avoid
          TypeScript narrowing warnings. */}
      <span className="sr-only">{isOwn ? "own" : ""}</span>
    </article>
  );
}

// ----------------------------------------------------------------------------
// Vote control — optimistic via useOptimistic-like local state.
// ----------------------------------------------------------------------------

function VoteControl({
  thread,
  courseId,
  currentUserId,
}: {
  thread: QaReplyView;
  courseId: string;
  currentUserId: string;
}) {
  const { t } = useTranslations();
  const [optimistic, setOptimistic] = useState({
    upvotes: thread.upvotes,
    downvotes: thread.downvotes,
    myVote: thread.myVote,
  });
  const [pending, startTransition] = useTransition();
  const isOwn = thread.authorId === currentUserId;
  const canVote = !isOwn && thread.kind !== "comment";

  const vote = async (next: -1 | 1) => {
    if (!canVote) return;
    const previous = optimistic;
    const myVote: -1 | 0 | 1 = previous.myVote === next ? 0 : next;
    const upvotes = previous.upvotes + (myVote === 1 ? 1 : 0) - (previous.myVote === 1 ? 1 : 0);
    const downvotes = previous.downvotes + (myVote === -1 ? 1 : 0) - (previous.myVote === -1 ? 1 : 0);
    setOptimistic({ upvotes, downvotes, myVote });
    startTransition(async () => {
      const result = await voteAction({
        threadId: thread.id,
        courseId,
        value: next,
      });
      if (!result.success) {
        setOptimistic(previous);
      } else if (
        typeof result.upvotes === "number" &&
        typeof result.downvotes === "number" &&
        typeof result.myVote === "number"
      ) {
        setOptimistic({
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          myVote: result.myVote,
        });
      }
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        disabled={!canVote || pending}
        aria-label={t("qna.vote.up")}
        title={canVote ? t("qna.vote.xpHint") : t("qna.vote.cantVoteOnOwn")}
        onClick={() => vote(1)}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors",
          optimistic.myVote === 1
            ? "border-emerald-400 bg-emerald-100 text-emerald-700"
            : "border-outline-variant bg-surface text-secondary hover:border-primary hover:text-primary",
          (!canVote || pending) && "opacity-50 cursor-not-allowed"
        )}
      >
        ▲
      </button>
      <span className="min-w-[2ch] text-center font-mono font-semibold text-on-surface">
        {optimistic.upvotes - optimistic.downvotes}
      </span>
      <button
        type="button"
        disabled={!canVote || pending}
        aria-label={t("qna.vote.down")}
        onClick={() => vote(-1)}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-colors",
          optimistic.myVote === -1
            ? "border-rose-400 bg-rose-100 text-rose-700"
            : "border-outline-variant bg-surface text-secondary hover:border-primary hover:text-primary",
          (!canVote || pending) && "opacity-50 cursor-not-allowed"
        )}
      >
        ▼
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Compose / answer / comment modals & inline forms
// ----------------------------------------------------------------------------

function ComposeModal({
  lessonId,
  courseId,
  onClose,
}: {
  lessonId: string;
  courseId: string;
  onClose: () => void;
}) {
  const { t } = useTranslations();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await askQuestionAction({
        lessonId,
        courseId,
        title,
        content,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to post question");
        return;
      }
      setTitle("");
      setContent("");
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl bg-surface-container-lowest p-6 shadow-lg">
        <h3 className="text-lg font-bold text-on-surface">{t("qna.compose.title")}</h3>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-on-surface-variant">{t("qna.compose.titleLabel")}</span>
            <input
              type="text"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("qna.compose.titlePlaceholder")}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-on-surface-variant">{t("qna.compose.contentLabel")}</span>
            <textarea
              value={content}
              maxLength={4000}
              rows={5}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("qna.compose.contentPlaceholder")}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <p className="text-xs text-secondary">{t("qna.compose.attachmentHelp")}</p>
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary"
            >
              {t("qna.compose.cancel")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {pending ? "…" : t("qna.compose.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerComposer({
  questionId,
  courseId,
  onClose,
}: {
  questionId: string;
  courseId: string;
  onClose: () => void;
}) {
  const { t } = useTranslations();
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await postAnswerAction({
        questionId,
        courseId,
        content,
      });
      if (!result.success) {
        setError(result.error ?? "Failed to post answer");
        return;
      }
      setContent("");
      onClose();
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-outline-variant pt-3">
      <textarea
        value={content}
        maxLength={4000}
        rows={3}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("qna.compose.contentPlaceholder")}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary"
        >
          {t("qna.compose.cancel")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          {t("qna.actions.answer")}
        </button>
      </div>
    </div>
  );
}

function CommentComposer({
  parentId,
  courseId,
}: {
  parentId: string;
  courseId: string;
}) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-full px-3 py-1 text-xs font-medium text-secondary hover:bg-surface-container-high"
      >
        + {t("qna.actions.comment")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-outline-variant pt-2">
      <textarea
        value={content}
        rows={2}
        maxLength={1000}
        onChange={(e) => setContent(e.target.value)}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs outline-none focus:border-primary"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setContent("");
          }}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-[11px] font-medium text-on-surface-variant hover:border-primary hover:text-primary"
        >
          {t("qna.compose.cancel")}
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(async () => {
              await postCommentAction({ parentId, courseId, content });
              setContent("");
              setOpen(false);
            });
          }}
          disabled={pending}
          className="rounded-lg bg-primary px-2 py-1 text-[11px] font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          {t("qna.actions.comment")}
        </button>
      </div>
    </div>
  );
}

function ModeratorButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick();
      }}
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
        tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "border-outline-variant bg-surface text-on-surface-variant hover:border-primary hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "indigo" | "muted";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    muted: "border-outline-variant bg-surface-container text-secondary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        map[tone] ?? map.muted
      )}
    >
      {children}
    </span>
  );
}

# Repo ke 4 issues mein ye theek karo (GitHub par, owner)

Maine issues page dekha. Ye masle hain:

| # | Masla | Karna |
|---|---|---|
| 1 | "Issue 1: Designer Agent folder setup..." purana version hai, #3 se takrata hai | Comment "Superseded by #3" likh kar **Close as not planned** |
| 2 | Publisher issue par label `designer_agent` laga hai | Label hata kar `publisher_agent` lagao, aur Contributor 2 ko **Assignee** |
| 3 | Designer issue | Contributor 1 ko **Assignee** |
| 4 | Main issue | Khud ko assignee |

Teeno (#2, #3, #4) ke body ke sab se upar ye block jod do:

**#3:**
> Workflow: `docs/WORKFLOW-CONTRIBUTOR-1-DESIGNER.md` | Database: `docs/DATABASE-ACCESS.md` | Branch: `feature/designer-agent` | PR mein `Closes #3`

**#2:**
> Workflow: `docs/WORKFLOW-CONTRIBUTOR-2-PUBLISHER.md` | Database: `docs/DATABASE-ACCESS.md` | Branch: `feature/publisher-scheduler` | PR mein `Closes #2`

**#4:**
> Workflow: `docs/WORKFLOW-OWNER.md` | Branch: `main`

Aur issue #3 ke Task mein ye line badal do: "Service role key sirf .env se aaye" -> "Agent apne user login (anon key) se chale, service_role key use nahi hogi."

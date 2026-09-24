"""
COURSE QUALITY OBJECTIVES — single source of truth
Internal framework inspired by general online-course-quality best practices.
Contains 50 objectives across three categories: Essential Design (E1-E20),
Advanced Design (A1-A15), Course Delivery (D1-D15).

These objectives describe broad, general indicators of course quality rather
than a specific external rubric's proprietary criteria. Each is intentionally
written as a general guideline — a description of what "good enough" and
"excellent" tend to look like — rather than a precise checklist tied to any
one organization's interpretation guide.

Per-objective fields:
  - accomplished_criteria: general indicators consistent with score=1
  - exemplary_criteria: additional general indicators consistent with score=2
  - where_to_look: Canvas locations to check for evidence
  - api_sources: Canvas API endpoints to query for evidence
  - keywords: heuristic terms for fast pre-scan
  - optional: True for optional objectives
"""

OBJECTIVES = {
    "E1": {
        "title": "Learning objectives are specific, measurable, and clearly defined.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Module introductions",
            "Course overview",
            "Assignment descriptions"
        ],
        "api_sources": ["syllabus", "pages_content", "assignments", "files"],
        "keywords": ["objective", "outcome", "will be able to", "students will", "you will"],
        "reflective_prompts": [
            "Could a student explain, in their own words, what they're expected to learn?",
            "Do the assessments actually measure what the objectives describe?",
            "Are the objectives specific and observable rather than vague?"
        ],
        "accomplished_criteria": [
            "Learning objectives are stated somewhere prominent, such as the syllabus or course introduction",
            "Objectives describe what a learner will be able to do, using reasonably observable language",
            "Objectives generally align with the course's assessments and activities"
        ],
        "exemplary_criteria": [
            "Objectives are reinforced in more than one place (e.g., syllabus and individual modules)",
            "Objectives are framed from the learner's point of view",
            "The language used to state the objectives themselves tends toward higher-order thinking rather than simple recall"
        ],
        "optional": False
    },
    "E2": {
        "title": "Course lists all required learning materials, including technology tools.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Module or course overview",
            "Tech Help (Module 0)",
            "Assignment descriptions"
        ],
        "api_sources": ["syllabus", "module_0_pages", "assignments"],
        "keywords": ["required", "textbook", "materials", "technology", "tools", "software"],
        "reflective_prompts": [
            "Would a student know, before starting, exactly what they need for this course?",
            "Is it easy to tell which materials are required versus optional?",
            "Can each material be connected to a learning goal or activity?"
        ],
        "accomplished_criteria": [
            "Required materials and any required technology are listed somewhere accessible",
            "Access instructions or links are provided",
            "Materials are easy to locate early in the course"
        ],
        "exemplary_criteria": [
            "Cost and access details are included",
            "Materials are referenced again in relevant modules, not just the syllabus",
            "The course explains how materials connect to learning goals"
        ],
        "optional": False
    },
    "E3": {
        "title": "Course provides office hours, communication preferences, and response times.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Course overview or homepage",
            "Faculty Info (Module 0)",
            "Announcements"
        ],
        "api_sources": ["syllabus", "module_0_pages", "files", "announcements"],
        "keywords": ["office hours", "response time", "respond within", "contact", "communication"],
        "reflective_prompts": [
            "If a student had a question in week one, would they know where to go?",
            "Is the format of office hours or contact clear?",
            "Does the course make reaching the instructor feel easy rather than intimidating?"
        ],
        "accomplished_criteria": [
            "A way to contact the instructor is stated, along with some sense of expected response time",
            "Office hours or an equivalent access point is identified"
        ],
        "exemplary_criteria": [
            "This information is reinforced in more than one place",
            "The tone is welcoming and approachable",
            "Multiple or flexible contact options are offered"
        ],
        "optional": False
    },
    "E4": {
        "title": "Course provides technical support resources and help for common technical issues.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Module or course overview",
            "Tech Help (Module 0)",
            "Assignment descriptions"
        ],
        "api_sources": ["syllabus", "module_0_pages", "assignments"],
        "keywords": ["technical support", "help desk", "technology help", "IT support", "canvas help"],
        "reflective_prompts": [
            "If something broke technically, would a student know where to turn?",
            "Does the guidance read as written for students, or like an IT policy page?",
            "Is help easy to find from the syllabus, orientation, or assignment instructions?"
        ],
        "accomplished_criteria": [
            "Contact information or links for technical help are available",
            "Guidance addresses common technical issues students are likely to encounter"
        ],
        "exemplary_criteria": [
            "This information appears in more than one place",
            "It's written in plain, student-friendly language",
            "Students are actively encouraged to reach out when they run into problems"
        ],
        "optional": False
    },
    "E5": {
        "title": "Course includes step-by-step guides or tutorials for all required technologies.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Course homepage",
            "Faculty Info (Module 0)",
            "Announcements"
        ],
        "api_sources": ["syllabus", "module_0_pages", "announcements"],
        "keywords": ["tutorial", "guide", "how to", "step-by-step", "instructions"],
        "reflective_prompts": [
            "Would someone unfamiliar with this course's tools feel confident getting started?",
            "Is help placed where students will actually encounter the need for it?",
            "Does the guidance address the actual required actions in this course?"
        ],
        "accomplished_criteria": [
            "Basic guidance exists for each required tool",
            "This guidance is available before students are expected to use the tool",
            "Examples or visuals support the instructions"
        ],
        "exemplary_criteria": [
            "Guidance is embedded directly where it's needed",
            "More than one format is used (e.g., text and video)",
            "Students have a low-stakes way to practice before graded use"
        ],
        "optional": False
    },
    "E6": {
        "title": "Course defines grading policies, academic integrity expectations, and late policies.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Assignment instructions",
            "Gradebook"
        ],
        "api_sources": ["syllabus", "assignments", "assignment_groups", "files"],
        "keywords": ["grading", "late policy", "academic integrity", "plagiarism", "grade"],
        "reflective_prompts": [
            "Would a student know exactly how their grade is calculated?",
            "Is academic integrity described in terms specific to this course, not just a policy link?",
            "Is the late-work policy specific, visible, and fair?"
        ],
        "accomplished_criteria": [
            "A grading breakdown is clearly explained",
            "An academic integrity policy is included",
            "A late-work policy is stated"
        ],
        "exemplary_criteria": [
            "Examples clarify grading expectations",
            "Exceptions or extensions are addressed",
            "Academic integrity is described with concrete examples, not just rules"
        ],
        "optional": False
    },
    "E7": {
        "title": "Course provides an accessibility statement and steps to request accommodations.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Course introduction",
            "University resources (Module 0)"
        ],
        "api_sources": ["syllabus", "module_0_pages"],
        "keywords": ["accessibility", "accommodation", "disability", "disability resources", "ADA"],
        "reflective_prompts": [
            "Would a student with a disability know exactly what to do and who to contact?",
            "Does this information feel like a genuine invitation, or a required disclaimer?",
            "Can students find this without hunting across multiple pages?"
        ],
        "accomplished_criteria": [
            "An accessibility statement is present",
            "Basic steps or contacts for requesting accommodations are included"
        ],
        "exemplary_criteria": [
            "This information appears in more than one place",
            "The tone is welcoming and clearly invites students to reach out",
            "Accessibility considerations are evident elsewhere in the course, not just in this statement"
        ],
        "optional": False
    },
    "E8": {
        "title": "Course includes information for relevant learner support and other services.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "University resources (Module 0)",
            "Course homepage"
        ],
        "api_sources": ["syllabus", "module_0_pages"],
        "keywords": ["tutoring", "writing center", "student services", "counseling", "support services"],
        "reflective_prompts": [
            "If a student were struggling — academically or otherwise — would they know where to turn?",
            "Is the information written for students, or does it read as pasted institutional language?",
            "Does this appear in more than one place?"
        ],
        "accomplished_criteria": [
            "Academic and non-academic support services are listed",
            "Links or access instructions are provided"
        ],
        "exemplary_criteria": [
            "This information is written in plain, encouraging language",
            "It appears in more than one location",
            "Students are actively encouraged to use these services"
        ],
        "optional": False
    },
    "E9": {
        "title": "Course includes a course schedule with due dates for all assignments and activities.",
        "section": "Essential Design",
        "where_to_look": [
            "Syllabus page or file",
            "Course calendar",
            "Module list",
            "Home page"
        ],
        "api_sources": ["syllabus", "pages_content", "assignments", "calendar_events"],
        "keywords": ["schedule", "due date", "calendar", "week 1", "module 1"],
        "reflective_prompts": [
            "Could a student plan their whole term using this schedule alone?",
            "Are dates for major assignments reflected consistently across the course?",
            "Is the schedule easy to find and up to date?"
        ],
        "accomplished_criteria": [
            "A schedule or calendar exists listing key due dates",
            "It's easy to locate"
        ],
        "exemplary_criteria": [
            "The schedule is reflected consistently across the course (e.g., syllabus and LMS calendar)",
            "It helps students plan ahead, not just track what's immediately due"
        ],
        "optional": False
    },
    "E10": {
        "title": "Course includes an introductory discussion and guidelines for student interactions.",
        "section": "Essential Design",
        "where_to_look": ["Discussion board", "Module 0 or 1"],
        "api_sources": ["module_0_pages", "discussions"],
        "keywords": ["introduce", "introduction", "get to know", "netiquette", "discussion guidelines"],
        "reflective_prompts": [
            "Is there an early opportunity for students to introduce themselves?",
            "Are expectations for interacting with peers reasonably clear?",
            "Does the instructor model participation somewhere?"
        ],
        "accomplished_criteria": [
            "Students are prompted to introduce themselves early on",
            "Basic expectations for how students should interact are shared"
        ],
        "exemplary_criteria": [
            "The instructor models participation with their own introduction or welcome",
            "Students have some flexibility in how they introduce themselves (e.g., text or video)",
            "Community-building is explicitly encouraged"
        ],
        "optional": False
    },
    "E11": {
        "title": "Course site navigation and layout are clear and consistent.",
        "section": "Essential Design",
        "where_to_look": [
            "Home page",
            "Modules Page",
            "Course Menu / Sidebar",
            "Pages with Student View"
        ],
        "api_sources": ["pages_content"],
        "keywords": [],
        "reflective_prompts": [
            "Would a new student find their way around without much friction?",
            "Are things named in a way that makes sense (not internal shorthand like 'Mod2finalv3')?",
            "Is there any orientation to how the course is organized?"
        ],
        "accomplished_criteria": [
            "Course structure is reasonably consistent from module to module",
            "Menus and sections are clearly labeled",
            "Students can find key materials without excessive searching"
        ],
        "exemplary_criteria": [
            "Visual and organizational consistency is maintained throughout",
            "The course provides some orientation to its own layout",
            "The design works reasonably well across devices"
        ],
        "optional": False
    },
    "E12": {
        "title": "Videos and other multimedia content are of appropriate quality and length.",
        "section": "Essential Design",
        "where_to_look": [
            "Home page",
            "Module 0",
            "Modules Page",
            "Instructional material pages",
            "Module outlines",
            "Media Gallery / Panopto",
            "Assignment Pages",
            "External Video Links"
        ],
        "api_sources": ["module_0_pages", "assignments", "caption_detection"],
        "keywords": ["video", "youtube", "panopto", "kaltura", "watch", "listen", "podcast"],
        "reflective_prompts": [
            "Is the audio clear and are visuals easy to read?",
            "Are videos a reasonable length, or broken into manageable segments if long?",
            "Are captions or transcripts available?"
        ],
        "accomplished_criteria": [
            "Videos and other media are relevant to the surrounding content",
            "Length is reasonable and files are accessible without issues"
        ],
        "exemplary_criteria": [
            "Longer content is chunked or segmented",
            "Captions and transcripts are provided",
            "Production quality supports rather than distracts from learning"
        ],
        "optional": False
    },
    "E13": {
        "title": "Course content is up-to-date, relevant, and tied to specific learning objectives.",
        "section": "Essential Design",
        "where_to_look": [
            "Instructional material pages",
            "Module outlines",
            "Assignment instructions",
            "Syllabus page or files"
        ],
        "api_sources": ["syllabus", "pages_content", "assignments", "files"],
        "keywords": [],
        "reflective_prompts": [
            "Does content reflect current thinking and practice in the field?",
            "Do modules explicitly connect content to learning goals?",
            "Does the material feel cohesive, or like a loose collection of resources?"
        ],
        "accomplished_criteria": [
            "Content is reasonably current and accurate",
            "Content is tied to specific learning objectives",
            "Materials support the course's stated outcomes"
        ],
        "exemplary_criteria": [
            "Examples relate to current context, research, or industry practice",
            "Materials feel purposefully curated rather than loosely assembled",
            "Connections between content and objectives are made explicit"
        ],
        "optional": False
    },
    "E14": {
        "title": "Course site provides an organized gradebook that includes all assessments.",
        "section": "Essential Design",
        "where_to_look": [
            "Gradebook",
            "Assignments page",
            "Syllabus page or file",
            "Student View of Grades"
        ],
        "api_sources": ["syllabus", "assignments", "assignment_groups"],
        "keywords": [],
        "reflective_prompts": [
            "Does the gradebook reflect everything described in the syllabus?",
            "Are there any missing, hidden, or duplicated items?",
            "Would a student find it easy to track their progress?"
        ],
        "accomplished_criteria": [
            "The gradebook is set up and reasonably accurate",
            "It reflects the grading structure described in the syllabus"
        ],
        "exemplary_criteria": [
            "Categories and weights are clearly labeled",
            "There are no missing or extraneous items",
            "Students can easily track their progress"
        ],
        "optional": False
    },
    "E15": {
        "title": "Course incorporates formative, low-stakes assessments for frequent engagement.",
        "section": "Essential Design",
        "where_to_look": [
            "Quizzes Page",
            "ILO pages",
            "Polls or surveys (external tools)",
            "Discussions",
            "Assignment descriptions",
            "Module overviews/outlines"
        ],
        "api_sources": ["pages_content", "assignments", "discussions", "quizzes"],
        "keywords": ["quiz", "check", "knowledge check", "reflection", "low stakes", "formative"],
        "reflective_prompts": [
            "Are there low-stakes ways for students to check their understanding along the way?",
            "Do these opportunities show up regularly, or only in a few places?",
            "Is feedback available before high-stakes work is due?"
        ],
        "accomplished_criteria": [
            "Some low-stakes practice opportunities exist",
            "They're reasonably aligned with the course's objectives"
        ],
        "exemplary_criteria": [
            "Opportunities are embedded regularly throughout the course",
            "They provide feedback before major, high-stakes assessments",
            "Some form of self-monitoring or progress-checking is supported"
        ],
        "optional": False
    },
    "E16": {
        "title": "Course provides a scaffolded approach for summative assessments.",
        "section": "Essential Design",
        "where_to_look": [
            "Assignments page",
            "Assignment instructions",
            "Syllabus page or file",
            "Modules page",
            "Module overview or outline"
        ],
        "api_sources": ["syllabus", "pages_content", "assignments"],
        "keywords": ["draft", "outline", "proposal", "scaffold", "milestone", "checkpoint"],
        "reflective_prompts": [
            "Do earlier activities help prepare students for the major assessments?",
            "Is there a logical sequence leading up to bigger assignments or exams?",
            "Is there any opportunity for revision along the way?"
        ],
        "accomplished_criteria": [
            "Summative assessments connect to earlier work rather than appearing without buildup",
            "A general progression is visible in how assignments are sequenced"
        ],
        "exemplary_criteria": [
            "The scaffolding is intentional and explained to students",
            "Milestones or drafts are built into the timeline"
        ],
        "optional": False
    },
    "E17": {
        "title": "All modules, assignments, and activities include clear and detailed instructions.",
        "section": "Essential Design",
        "where_to_look": [
            "Assignment descriptions",
            "Discussions",
            "External tools",
            "ILO pages",
            "Quiz instructions",
            "Module overview/outlines"
        ],
        "api_sources": ["pages_content", "assignments", "discussions", "quizzes"],
        "keywords": ["instructions", "directions", "submit", "complete", "requirements"],
        "reflective_prompts": [
            "Would a student know exactly what's expected without needing to ask?",
            "Are format, length, and submission details spelled out?",
            "Do instructions connect the activity to what students are learning?"
        ],
        "accomplished_criteria": [
            "Instructions are reasonably clear across most activities",
            "Required components and submission steps are stated"
        ],
        "exemplary_criteria": [
            "Instructions are formatted for easy scanning (e.g., numbered steps)",
            "Examples or visuals support understanding",
            "Instructions anticipate likely student questions"
        ],
        "optional": False
    },
    "E18": {
        "title": "Course includes rubrics for all assignments and assessments.",
        "section": "Essential Design",
        "where_to_look": ["Assignment page", "Discussions page", "Rubrics page"],
        "api_sources": ["assignments", "discussions", "assignments_with_rubrics"],
        "keywords": ["rubric", "criteria", "grading criteria"],
        "reflective_prompts": [
            "Would a student know how their work will be evaluated before submitting it?",
            "Do rubrics or scoring guides include real criteria, or just a point total?",
            "Are they visible before the assessment is due?"
        ],
        "accomplished_criteria": [
            "Some form of rubric, checklist, or scoring guide exists for graded work",
            "It gives students a reasonable sense of what's expected"
        ],
        "exemplary_criteria": [
            "Rubrics use specific, descriptive language rather than vague labels",
            "They're visible to students before they begin the work",
            "Scoring expectations are clear even for less conventional assessments (e.g., exams)"
        ],
        "optional": False
    },
    "E19": {
        "title": "Course workload is balanced and appropriate for the discipline and course level.",
        "section": "Essential Design",
        "where_to_look": ["Syllabus (Schedule Section)", "Module Pages", "Calendar", "Announcements"],
        "api_sources": ["syllabus", "pages_content", "files", "announcements", "calendar_events"],
        "keywords": [],
        "reflective_prompts": [
            "Does the pace feel realistic for the credit level and typical student circumstances?",
            "Are there any weeks that look dramatically heavier or lighter than others?",
            "Is there any guidance about expected time commitment?"
        ],
        "accomplished_criteria": [
            "Workload is generally appropriate for the credit level",
            "Work is reasonably distributed across the term, without extreme spikes"
        ],
        "exemplary_criteria": [
            "Time expectations are made transparent to students",
            "Students can preview upcoming workload",
            "Some flexibility or pacing options exist"
        ],
        "optional": False
    },
    "E20": {
        "title": "Course materials are free of broken links, spelling errors, and incorrect information.",
        "section": "Essential Design",
        "where_to_look": ["Content pages", "Announcements", "Module content pages", "Link validator", "Home page"],
        "api_sources": ["pages_content", "announcements"],
        "keywords": [],
        "reflective_prompts": [
            "Do all the links actually work?",
            "Are there noticeable typos, unclear grammar, or formatting issues?",
            "Does anything reference outdated tools, dates, or policies?"
        ],
        "accomplished_criteria": [
            "Links function correctly",
            "The course is free of major errors or clearly outdated information"
        ],
        "exemplary_criteria": [
            "There's some evidence of an ongoing quality-check process",
            "Students have a way to flag issues if they find them",
            "Content shows signs of being actively maintained, not just built once and left alone"
        ],
        "optional": False
    },
    "A1": {
        "title": "Course learning objectives and/or outcomes use learner-centered language.",
        "section": "Advanced Design",
        "where_to_look": ["Syllabus", "Module Overview Pages", "Assignment Instructions"],
        "api_sources": ["syllabus", "pages_content", "assignments"],
        "keywords": ["you will", "students will be able", "learners will", "by the end"],
        "reflective_prompts": [
            "Do the objectives use language a student would actually understand?",
            "Are they framed as something the student will do, rather than what the course covers?",
            "Do they appear in more than one place?"
        ],
        "accomplished_criteria": [
            "Objectives are stated in language a student can easily understand",
            "Objectives use action-oriented phrasing rather than passive or instructor-centered wording"
        ],
        "exemplary_criteria": [
            "Objectives are consistently framed from the learner's perspective",
            "They're tied to some sense of real-world relevance",
            "They appear in more than one location"
        ],
        "optional": False
    },
    "A2": {
        "title": "Course includes a pre-course technology checklist and online readiness quiz.",
        "section": "Advanced Design",
        "where_to_look": ["Course Orientation Module", "Welcome Page", "Quizzes or Surveys"],
        "api_sources": ["module_0_pages", "pages_content", "quizzes"],
        "keywords": ["readiness", "technology checklist", "before you begin", "are you ready"],
        "reflective_prompts": [
            "Could a student check, before day one, whether they have what they need?",
            "Is support offered to students who aren't fully ready?",
            "Is this available before the first real task?"
        ],
        "accomplished_criteria": [
            "A checklist or short quiz helps students confirm readiness",
            "Support resources are linked for students who need them"
        ],
        "exemplary_criteria": [
            "The check is interactive and gives useful, immediate feedback",
            "The instructor references or follows up on readiness results",
            "Support resources are tailored based on the results"
        ],
        "optional": False
    },
    "A3": {
        "title": "Course includes an orientation module, video, or guide to navigating the course.",
        "section": "Advanced Design",
        "where_to_look": ["Start Here Module", "Welcome Video", "Intro Activity"],
        "api_sources": ["module_0_pages", "pages_content"],
        "keywords": ["orientation", "start here", "welcome", "navigate", "how to use this course"],
        "reflective_prompts": [
            "Is course navigation clearly explained somewhere near the start?",
            "Does the orientation use more than just plain text?",
            "Are students asked to demonstrate they understand the basics?"
        ],
        "accomplished_criteria": [
            "The orientation covers how to navigate the course",
            "It explains how to access grades, tools, and help",
            "The course's purpose is introduced"
        ],
        "exemplary_criteria": [
            "The orientation is interactive or uses multimedia",
            "It feels personalized rather than generic",
            "There's some kind of completion check (e.g., a short syllabus quiz)"
        ],
        "optional": False
    },
    "A4": {
        "title": "Course includes explicit guidelines for using generative AI.",
        "section": "Advanced Design",
        "where_to_look": ["Syllabus", "Assignment Instructions", "Policy Page"],
        "api_sources": ["syllabus", "assignments"],
        "keywords": ["generative ai", "artificial intelligence", "chatgpt", "ai tools", "ai policy", "AI"],
        "reflective_prompts": [
            "Would a student know what's actually allowed when it comes to AI tools?",
            "Is the guidance specific to this course, or a generic disclaimer?",
            "Are students invited to think through the implications themselves?"
        ],
        "accomplished_criteria": [
            "An AI use policy exists",
            "Acceptable and unacceptable uses are explained",
            "Academic integrity expectations related to AI are clear"
        ],
        "exemplary_criteria": [
            "The policy includes concrete examples of allowed versus disallowed use",
            "It appears in more than one place",
            "Students are invited to reflect on responsible AI use"
        ],
        "optional": False
    },
    "A5": {
        "title": "Course uses exclusively low- or no-cost materials.",
        "section": "Advanced Design",
        "where_to_look": ["Syllabus", "Modules with OER", "Instructor-Created Pages"],
        "api_sources": ["syllabus", "pages_content"],
        "keywords": ["free", "open access", "no cost", "low cost", "OER", "open educational"],
        "reflective_prompts": [
            "Would a student need to pay for anything required in this course?",
            "Is affordability something the course actively acknowledges?",
            "Are free materials clearly organized and easy to access?"
        ],
        "accomplished_criteria": [
            "Required materials carry no or minimal cost",
            "Access instructions are clear"
        ],
        "exemplary_criteria": [
            "The course explicitly highlights its affordability",
            "Free, high-quality supplemental resources are curated"
        ],
        "optional": True
    },
    "A6": {
        "title": "Course provides multiple pathways for learners to meet learning objectives.",
        "section": "Advanced Design",
        "where_to_look": ["Assignment Instructions", "Module Overviews", "Optional Activities"],
        "api_sources": ["pages_content", "assignments"],
        "keywords": ["choice", "option", "alternative", "pathway", "you may choose"],
        "reflective_prompts": [
            "Do students have any real choice in how they engage or demonstrate learning?",
            "Are those choices clearly explained?"
        ],
        "accomplished_criteria": [
            "Students can choose between formats or topics in at least some activities",
            "Options are clearly explained"
        ],
        "exemplary_criteria": [
            "Choice extends to how learning itself is demonstrated",
            "Flexible pacing or student-proposed paths are supported"
        ],
        "optional": True
    },
    "A7": {
        "title": "Content includes examples that represent a range of learner backgrounds.",
        "section": "Advanced Design",
        "where_to_look": ["Readings", "Multimedia", "Assignment Scenarios"],
        "api_sources": ["assignments"],
        "keywords": ["diverse", "inclusive", "representation", "background", "culture"],
        "reflective_prompts": [
            "Do the examples used reflect more than one kind of perspective or experience?",
            "Does representation feel genuinely integrated, or more like an afterthought?",
            "Do students get a chance to bring in their own perspectives?"
        ],
        "accomplished_criteria": [
            "Examples and media draw from more than one cultural or experiential perspective",
            "Content avoids relying on stereotypes"
        ],
        "exemplary_criteria": [
            "Representation feels meaningfully woven into the course, not token",
            "Students have opportunities to reflect on or share their own lived experience"
        ],
        "optional": False
    },
    "A8": {
        "title": "Course includes an online forum for muddiest points or questions about the course.",
        "section": "Advanced Design",
        "where_to_look": ["Q&A Forum", "Help Board", "Announcements"],
        "api_sources": ["discussions"],
        "keywords": ["muddy point", "questions about the course", "Q&A", "general questions", "course questions", "cafe", "questions", "general"],
        "reflective_prompts": [
            "Is there a clear place for general questions, separate from content discussions?",
            "Does the instructor actually respond there?",
            "Are peer answers encouraged?"
        ],
        "accomplished_criteria": [
            "A space for general course questions exists",
            "The instructor responds there with some regularity"
        ],
        "exemplary_criteria": [
            "The instructor models its use",
            "Peer responses are encouraged",
            "The space is referenced elsewhere in the course"
        ],
        "optional": False
    },
    "A9": {
        "title": "Course incorporates adaptive learning strategies to personalize learning.",
        "section": "Advanced Design",
        "where_to_look": ["Mastery Paths", "Release Conditions", "Feedback Tools"],
        "api_sources": ["syllabus", "pages_content", "release_conditions"],
        "keywords": ["adaptive", "personalized", "mastery", "branching", "differentiated"],
        "reflective_prompts": [
            "Does anything about content or pacing adjust based on the learner?",
            "Are any adaptive tools used, and do they seem to work well?"
        ],
        "accomplished_criteria": [
            "Some content or pacing adjusts based on performance or choice",
            "Feedback exists to help guide learners"
        ],
        "exemplary_criteria": [
            "Personalization is guided by some diagnostic tool or structured feedback",
            "Learners have a way to track their own progress"
        ],
        "optional": True
    },
    "A10": {
        "title": "Text materials meet accessibility and Universal Design standards.",
        "section": "Advanced Design",
        "where_to_look": ["PDFs and Word Docs", "Pages", "Syllabus"],
        "api_sources": ["syllabus"],
        "keywords": [],
        "reflective_prompts": [
            "Would these documents work reasonably well with a screen reader?",
            "Do they follow basic formatting conventions (headings, contrast, alt text)?",
            "Is accessibility something the course seems to have actually considered?"
        ],
        "accomplished_criteria": [
            "Documents use reasonable formatting practices (headings, contrast, alt text where relevant)",
            "Files open and display properly across common devices"
        ],
        "exemplary_criteria": [
            "Materials appear to have been checked with accessibility in mind",
            "Documents are available in more than one format where relevant"
        ],
        "optional": False
    },
    "A11": {
        "title": "Videos and other multimedia content meet accessibility standards.",
        "section": "Advanced Design",
        "where_to_look": ["Module Videos", "External Links", "Media Gallery"],
        "api_sources": ["pages_content"],
        "keywords": ["caption", "transcript", "alt text", "closed caption", "subtitle"],
        "reflective_prompts": [
            "Do videos have captions?",
            "Are transcripts available for audio content?",
            "Does accessible design seem intentional rather than incidental?"
        ],
        "accomplished_criteria": [
            "Captions are provided for video content",
            "Transcripts are available for audio content"
        ],
        "exemplary_criteria": [
            "Captions appear accurate, not just auto-generated and unreviewed",
            "Accessible multimedia practice is evident consistently, not just in a few places"
        ],
        "optional": False
    },
    "A12": {
        "title": "Course includes ways for learners to contribute meaningfully to course content.",
        "section": "Advanced Design",
        "where_to_look": ["Discussions", "Wikis", "Collaborative Docs"],
        "api_sources": ["discussions"],
        "keywords": ["contribute", "co-create", "student-generated", "peer", "wiki", "collaborative"],
        "reflective_prompts": [
            "Can students actually shape any part of the course content?",
            "Does the instructor acknowledge when they do?",
            "Are there tools in place that make this possible?"
        ],
        "accomplished_criteria": [
            "Students have a way to share examples or resources",
            "The instructor acknowledges these contributions"
        ],
        "exemplary_criteria": [
            "Student contributions visibly shape the course over time",
            "Students are treated as co-creators, not just contributors"
        ],
        "optional": False
    },
    "A13": {
        "title": "Course includes model deliverables for summative assessments.",
        "section": "Advanced Design",
        "where_to_look": ["Assignment Pages", "Module Instructions"],
        "api_sources": ["pages_content", "assignments"],
        "keywords": ["example", "sample", "model", "exemplar", "student example"],
        "reflective_prompts": [
            "Is there at least one example of what a strong submission looks like?",
            "Is it available before the related due date?",
            "Does it actually clarify expectations, or just exist for its own sake?"
        ],
        "accomplished_criteria": [
            "At least one example of successful work is shown for a relevant assignment",
            "It's available before the due date"
        ],
        "exemplary_criteria": [
            "More than one example is provided",
            "Examples are explained or annotated",
            "Past student work is included where appropriate (with permission)"
        ],
        "optional": True
    },
    "A14": {
        "title": "Course includes assessments with practical, real-world applications.",
        "section": "Advanced Design",
        "where_to_look": ["Project Descriptions", "Case Studies", "Assignment Prompts"],
        "api_sources": ["assignments"],
        "keywords": ["real-world", "application", "practical", "industry", "professional", "case study"],
        "reflective_prompts": [
            "Do any assessments connect to a real audience, problem, or scenario?",
            "Is the relevance to real-world practice made explicit?"
        ],
        "accomplished_criteria": [
            "At least one assessment ties to a real-world scenario or application",
            "Its relevance to the course's goals is explained"
        ],
        "exemplary_criteria": [
            "Authentic, real-world work is a consistent feature",
            "Students have some choice in real-world topics",
            "The course frames why this relevance matters"
        ],
        "optional": False
    },
    "A15": {
        "title": "Course supports learner metacognition through periodic self-reflection activities.",
        "section": "Advanced Design",
        "where_to_look": ["Journals", "Reflection Assignments", "Surveys"],
        "api_sources": ["assignments", "quizzes"],
        "keywords": ["reflection", "self-assessment", "metacognition", "what did you learn", "journal"],
        "reflective_prompts": [
            "Are students asked to reflect on their own learning more than once?",
            "Are these reflections structured, or just open-ended prompts with no follow-through?"
        ],
        "accomplished_criteria": [
            "Students reflect on their own learning strategies at more than one point",
            "Reflection prompts connect to course outcomes"
        ],
        "exemplary_criteria": [
            "Reflection prompts are structured and consistent",
            "The instructor responds to or synthesizes what students share",
            "Reflections connect to students' own goals"
        ],
        "optional": False
    },
    "D1": {
        "title": "Instructor provides a personal introduction to the course.",
        "section": "Course Delivery",
        "where_to_look": ["Announcements", "Module 0 pages", "Discussion boards", "Course homepage"],
        "api_sources": ["module_0_pages", "discussions"],
        "keywords": ["introduction", "welcome", "about me", "instructor", "meet your"],
        "reflective_prompts": [
            "Does the course begin with some kind of personal welcome from the instructor?",
            "Does it go beyond a name and title?",
            "Does it invite students to respond or introduce themselves too?"
        ],
        "accomplished_criteria": [
            "A personal introduction exists, in writing or video",
            "It gives students some sense of who the instructor is and what to expect"
        ],
        "exemplary_criteria": [
            "The introduction combines more than one format (e.g., video and text)",
            "It invites student interaction",
            "It's accessible — captions or a transcript accompany any video"
        ],
        "optional": False
    },
    "D2": {
        "title": "Instructor releases modules and content in the course site in a timely manner.",
        "section": "Course Delivery",
        "where_to_look": ["Module publish dates", "Course settings", "Announcements"],
        "api_sources": [],
        "keywords": [],
        "reflective_prompts": [
            "Do students generally know when new content will appear?",
            "Is there a consistent pattern, or does release feel unpredictable?",
            "Is any delay communicated clearly?"
        ],
        "accomplished_criteria": [
            "Content is generally released on a schedule students can rely on",
            "The release pattern is reasonably consistent"
        ],
        "exemplary_criteria": [
            "Release is fully consistent and clearly communicated in advance",
            "Some flexible or early access is offered where appropriate"
        ],
        "optional": False
    },
    "D3": {
        "title": "Instructor posts regular and relevant announcements on the course site.",
        "section": "Course Delivery",
        "where_to_look": ["Announcements feed", "Course homepage"],
        "api_sources": ["discussions", "announcements"],
        "keywords": ["announcement", "update", "reminder", "week", "due"],
        "reflective_prompts": [
            "Do announcements show up with reasonable regularity?",
            "Do they relate to actual coursework rather than being generic filler?",
            "Do they help keep students motivated, not just informed?"
        ],
        "accomplished_criteria": [
            "Announcements are posted with reasonable regularity throughout the term",
            "They relate to actual coursework and deadlines"
        ],
        "exemplary_criteria": [
            "Announcements are timely, relevant, and genuinely engaging",
            "They mix encouragement with logistics",
            "More than one format is used (e.g., text plus audio or video)"
        ],
        "optional": False
    },
    "D4": {
        "title": "Instructor contributes meaningfully to online activities and discussions.",
        "section": "Course Delivery",
        "where_to_look": ["Discussion boards", "Group activities", "Online activities"],
        "api_sources": ["discussions"],
        "keywords": [],
        "reflective_prompts": [
            "Does the instructor participate beyond logistics and grading notes?",
            "Do their contributions push student thinking further?",
            "Does their presence feel genuine, not just procedural?"
        ],
        "accomplished_criteria": [
            "The instructor regularly contributes to discussions",
            "Participation is substantive, not purely logistical"
        ],
        "exemplary_criteria": [
            "Contributions foster deeper thinking and reflection",
            "The instructor models strong discourse and asks follow-up questions",
            "Their presence contributes to an intellectually engaging environment"
        ],
        "optional": False
    },
    "D5": {
        "title": "Instructor provides specific and targeted feedback on assignments.",
        "section": "Course Delivery",
        "where_to_look": ["SpeedGrader comments", "Submission feedback", "Gradebook comments"],
        "api_sources": [],
        "keywords": [],
        "reflective_prompts": [
            "Does feedback go beyond a grade and generic praise?",
            "Does it reference specific strengths and specific areas to improve?",
            "Does it arrive early enough to be useful for future work?"
        ],
        "accomplished_criteria": [
            "Feedback is specific and constructive, not just a grade",
            "It offers some guidance on strengths and areas for improvement"
        ],
        "exemplary_criteria": [
            "Feedback is consistently tied to clear expectations or criteria",
            "It includes concrete examples or suggestions for improvement",
            "It encourages reflection or revision"
        ],
        "optional": False
    },
    "D6": {
        "title": "Instructor provides feedback and grades on assessments in a timely manner.",
        "section": "Course Delivery",
        "where_to_look": ["Gradebook timestamps", "Submission return dates", "Syllabus grading timeline"],
        "api_sources": [],
        "keywords": [],
        "reflective_prompts": [
            "Do grades and feedback come back soon enough to be useful?",
            "Is turnaround consistent across the term, or unpredictable?"
        ],
        "accomplished_criteria": [
            "Grades and feedback generally arrive within a reasonable time frame",
            "Turnaround is reasonably consistent"
        ],
        "exemplary_criteria": [
            "Feedback is consistently timely across all assessments",
            "The grading process is efficient and predictable enough that students can plan around it"
        ],
        "optional": False
    },
    "D7": {
        "title": "Instructor actively engages with learners who show signs of struggle in the course.",
        "section": "Course Delivery",
        "where_to_look": ["Direct messages", "Instructor outreach records", "LMS analytics", "Announcement tone"],
        "api_sources": [],
        "keywords": [],
        "reflective_prompts": [
            "Is there any evidence of outreach to students who are missing work or disengaged?",
            "Are students pointed toward relevant support when they need it?",
            "Does outreach happen early, before things escalate?"
        ],
        "accomplished_criteria": [
            "Some outreach to struggling students is evident",
            "Students are directed to available support resources"
        ],
        "exemplary_criteria": [
            "Outreach is proactive and reasonably consistent",
            "Support connects students to real resources, not just a generic check-in",
            "Intervention tends to happen before disengagement escalates"
        ],
        "optional": False
    },
    "D8": {
        "title": "Instructor uses supportive language in all feedback and communications.",
        "section": "Course Delivery",
        "where_to_look": ["Announcement text", "Feedback comments", "Discussion replies", "Email/message tone"],
        "api_sources": ["discussions"],
        "keywords": [],
        "reflective_prompts": [
            "Does the tone across feedback and communication feel encouraging?",
            "Are critiques balanced with affirmation?",
            "Would a student reading this feel supported rather than judged?"
        ],
        "accomplished_criteria": [
            "Communication is generally supportive and constructive",
            "The tone is clear and professional, not discouraging"
        ],
        "exemplary_criteria": [
            "A supportive, growth-oriented tone is consistent throughout all communications",
            "Feedback is specific and empowering, not just polite"
        ],
        "optional": False
    },
    "D9": {
        "title": "Instructor encourages or incentivizes learners to participate in office hours.",
        "section": "Course Delivery",
        "where_to_look": ["Announcements", "Discussion posts", "Assignment instructions", "Course pages"],
        "api_sources": ["module_0_pages", "discussions", "announcements"],
        "keywords": ["office hours", "meet with me", "appointment", "drop by", "encouraged to attend"],
        "reflective_prompts": [
            "Are office hours mentioned more than once, or just buried in the syllabus?",
            "Are they framed as useful for everyone, not just students who are behind?",
            "Are flexible formats or incentives offered?"
        ],
        "accomplished_criteria": [
            "Office hours are mentioned and reasonably encouraged",
            "They're framed as broadly useful, not just remedial"
        ],
        "exemplary_criteria": [
            "Attendance is actively promoted and incentivized",
            "Flexible formats accommodate different schedules",
            "Students seem to genuinely view office hours as valuable"
        ],
        "optional": False
    },
    "D10": {
        "title": "Instructor responds to student communications and inquiries in a timely manner.",
        "section": "Course Delivery",
        "where_to_look": ["Message response timestamps", "Discussion reply times", "Student communications"],
        "api_sources": [],
        "keywords": [],
        "reflective_prompts": [
            "Do students generally get a response within a reasonable window?",
            "Is response time consistent across the term?",
            "Do students at least get acknowledged even if a full answer takes longer?"
        ],
        "accomplished_criteria": [
            "Responses generally arrive within a reasonable time frame",
            "Responses adequately address student concerns"
        ],
        "exemplary_criteria": [
            "Response time is consistently fast, clear, and helpful",
            "More than one communication channel is available",
            "Stated response-time expectations are actually met"
        ],
        "optional": False
    },
    "D11": {
        "title": "Instructor provides end-of-module summaries based upon learner contributions.",
        "section": "Course Delivery",
        "where_to_look": ["Announcements", "Discussion boards", "Module pages", "End-of-module content"],
        "api_sources": ["discussions", "announcements"],
        "keywords": ["summary", "wrap up", "key takeaway", "this week", "looking back", "you shared"],
        "reflective_prompts": [
            "Does the instructor post something that wraps up each module?",
            "Does it reference what students actually discussed or produced?",
            "Is this done consistently across modules?"
        ],
        "accomplished_criteria": [
            "Some kind of module wrap-up is provided",
            "It highlights key concepts or takeaways",
            "It references at least some student contributions"
        ],
        "exemplary_criteria": [
            "Wrap-ups are consistent and structured across modules",
            "They connect student contributions, instructor insight, and key concepts together",
            "They help bridge to what's coming next"
        ],
        "optional": False
    },
    "D12": {
        "title": "Instructor encourages learner-to-learner engagement in online activities.",
        "section": "Course Delivery",
        "where_to_look": ["Discussion instructions", "Assignment prompts", "Group activity setups", "Peer review structures"],
        "api_sources": ["discussions", "assignments", "peer_review_settings"],
        "keywords": ["respond to a peer", "peer review", "group", "collaborate", "reply to", "your classmates"],
        "reflective_prompts": [
            "Do discussions or activities actually require students to engage with each other?",
            "Is peer interaction structured, or left entirely open-ended?",
            "Does the instructor help facilitate it?"
        ],
        "accomplished_criteria": [
            "Some structured opportunities for peer interaction exist",
            "Discussions or peer review activities are included"
        ],
        "exemplary_criteria": [
            "Learner-to-learner engagement is actively promoted and facilitated",
            "Activities are structured to encourage genuine, substantive interaction",
            "The instructor monitors and guides interaction quality"
        ],
        "optional": False
    },
    "D13": {
        "title": "Instructor adjusts content, assignments, and dates in response to learner needs.",
        "section": "Course Delivery",
        "where_to_look": ["Announcements about changes", "Updated assignment dates", "Modified course materials"],
        "api_sources": [],
        "keywords": [],
        "reflective_prompts": [
            "Is there evidence the instructor has adjusted anything based on how students are doing?",
            "Are changes communicated clearly, with some explanation?",
            "Does flexibility seem balanced against maintaining reasonable rigor?"
        ],
        "accomplished_criteria": [
            "Some adjustments are made based on student needs when appropriate",
            "Changes are communicated to students"
        ],
        "exemplary_criteria": [
            "Adjustments happen proactively, not just reactively",
            "Changes are transparent and clearly traceable to student input",
            "Rigor is maintained even as flexibility is offered"
        ],
        "optional": False
    },
    "D14": {
        "title": "Instructor solicits learner feedback about the course at multiple points in the term.",
        "section": "Course Delivery",
        "where_to_look": ["Surveys", "Mid-course evaluations", "Discussion check-ins", "Announcements requesting feedback"],
        "api_sources": ["discussions", "announcements"],
        "keywords": ["feedback", "survey", "how is the course", "mid-course", "check-in", "your thoughts"],
        "reflective_prompts": [
            "Is feedback collected more than once during the term?",
            "Is it easy for students to actually give feedback?",
            "Does anything change as a result?"
        ],
        "accomplished_criteria": [
            "Some learner feedback is collected at more than one point",
            "Feedback mechanisms are reasonably accessible"
        ],
        "exemplary_criteria": [
            "Feedback is solicited actively and consistently throughout the term",
            "More than one structured mechanism is used (surveys, check-ins, open forums)",
            "Feedback appears to be reviewed and acted upon"
        ],
        "optional": False
    },
    "D15": {
        "title": "Instructor incorporates personal examples to supplement course content.",
        "section": "Course Delivery",
        "where_to_look": ["Discussion posts", "Announcements", "Lecture content", "Feedback comments"],
        "api_sources": ["discussions", "module_0_pages", "announcements"],
        "keywords": ["in my experience", "when I", "personally", "I have found", "from my work", "I once"],
        "reflective_prompts": [
            "Does the instructor draw on their own experience to illustrate ideas?",
            "Do these examples help connect theory to practice?",
            "Does the instructor's personality come through, or does the course feel impersonal?"
        ],
        "accomplished_criteria": [
            "Personal or professional examples are used to supplement content",
            "Examples help connect theory to practice"
        ],
        "exemplary_criteria": [
            "Personal examples are woven consistently throughout the course",
            "They deepen understanding and help students connect with the material",
            "The instructor's relevant expertise is evident"
        ],
        "optional": False
    }
}
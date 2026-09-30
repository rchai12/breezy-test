Problem:

When expanding questions in the FAQ section, and revealing their answers, the boxes stay open. Such that, when you click the x button to contract the question, to its original state, it does nothing and stays expanded. Clicking expand on another question, should also contract the previous expanded question, and expand the newly selected question. However, previously expanded stays open, while also expanding the newly selected question. This closing questions part is a functionality that should be fixed. The closing of previous expanded questions, seems more of a design direction, such that when there are more questions, it may be more useful to only show the relevant answers, when the user needs them.

Things to note:

Breezy TM logo at top left does not reroute to homepage, a function typical in mose webpages. Start Breathing better button reroutes to homepage? Probably intended more as a dummy reroute for now? May be my display problem, but the text area on the bottom is difficult for me to read. Dim with text legibility not really contrasting with the background color. Intended?

Code Inspection:

The toggleFaq function fails because it strictly only opens the answer. No functionality for closing or toggling. Changing from .add('open') to .toggle('open') could fix issue for closing expanded toggles. But it doesn't fix the issue where previously expanded questions do not close when expanding new questions. A listener needs to be put in place, so the faq is aware when a question is open.
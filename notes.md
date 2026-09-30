Problem:

When expanding questions in the FAQ section, and revealing their answers, the boxes stay open. Such that, when you click the x button to contract the question, to its original state, it does nothing and stays expanded. Clicking expand on another question, should also contract the previous expanded question, and expand the newly selected question. However, previously expanded stays open, while also expanding the newly selected question. This closing questions part is a functionality that should be fixed. The closing of previous expanded questions, seems more of a design direction, such that when there are more questions, it may be more useful to only show the relevant answers, when the user needs them.

Things to note:

Breezy TM logo at top left does not reroute to homepage, a function typical in mose webpages. Start Breathing better button reroutes to homepage? Probably intended more as a dummy reroute for now? May be my display problem, but the text area on the bottom is difficult for me to read. Dim with text legibility not really contrasting with the background color. Intended?

Code Inspection:

The toggleFaq function fails because it strictly only opens the answer. No functionality for closing or toggling. Changing from .add('open') to .toggle('open') could fix issue for closing expanded toggles. But it doesn't fix the issue where previously expanded questions do not close when expanding new questions. A listener needs to be put in place, so the faq is aware when a question is open.

Faq Fix:

Upon physical inspection, the faq section seems to be fixed properly. Opening questions for answers works, closing answers works, and opening a new question, closes the previous question answer.

Proposed Feature - Signing Up:

I wanted to simulate the sign up process. This meant, ensuring routing for areas from the homepage for purchasing the subscription, navigated to the sign up areas. This means creating a page that lists comparisons of the different tiers (that are available online), as well as the form area where a user has to create an account, along with their payment details.

Considered using the existing plan comparision area on the homepage, and only having that route to signup/payment. But I thought a customer might appreciate a more isolated experience, that focused on plan comparison only.

Realized if i am going to add more pages and functionality, I should also modularize the homepage.

Realized it is best to include testing, to ensure reliability of existing features, while also ensuring future features do not break anything.

Had to think about the comparison table to be honest. I wanted to keep it simple, but the recommendations was that certain layouts would fit better for phone layouts. Phones are often the one of the most used devices for web browsing nowadays, so it is best to develop with that audience in mind. Need to be tested though to ensure presentation is good.


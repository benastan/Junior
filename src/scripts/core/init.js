require(["junior"],function(Jr) {
	
	// Experts only should hack this..
	
	// Anchors should act as links.
	$('a').live({
		click: Jr.link
	});

	// Start monitoring for controllers.
	Jr.monitor();
});

/**
 * Changes which tab is shown
 * @param string tab
 */
function showPopularTab(tab) {
	$(".mostPopularModule ul.itemlist").hide();
	$(".mostPopularModule ul."+tab).show();
	$(".mostPopularModule .subnav li").removeClass('on');
	$(".mostPopularModule .subnav li."+tab).addClass('on');
}
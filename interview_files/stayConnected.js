$().ready(function(){
	$('#stayConnectedForm input[type="text"]').fieldText();
	$('#stayConnectedBlock').delegate('input#connectedSubmit','click', function(event){
		event.preventDefault();
		$.post("/shared/stay_connected", $('form#stayConnectedForm').serialize(), function(data){
			$('div#stayConnectedFormHolder').html(data);
		});
		return false;
	});
	return false;
});

$.fn.fieldText = function(event){
	$(".defaultText").focus(function(srcc)
   {
       if ($(this).val() == $(this)[0].title)
       {
           $(this).removeClass("defaultTextActive");
           $(this).val("");
       }
   });
   
   $(".defaultText").blur(function()
   {
       if ($(this).val() == "")
       {
           $(this).addClass("defaultTextActive");
           $(this).val($(this)[0].title);
       }
   });
   
   $(".defaultText").blur();
}
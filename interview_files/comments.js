// on page load, get the comments and listen for some user actions

(function($) {
	
	// create the RS namespace if it does not yet exist
	RS = RS || {};
	/*
	 * RS Comments Module
	 */
	RS.Comments = function() { // called immediately, returns an object
		
		// ------------------ private props ------------------
		
		// config constants
		var COMMENTS_PER_PAGE = 50,
			DEFAULT_COMMENT_TEXT = 'Type your comment here.',
			DEFAULT_REVIEW_TEXT = 'Type your review here.';
		
		// props
		var isReview = false,
			allComments = null,
			currentCommentPage = 1
			isCommentSubmitting = false;
			
		// DOM elements
		var $theComments = null,
			$readMoreBtn = null,
			$postCommentBtn = null;
		
		
		// ------------------ public methods ------------------
		
		function init() {
			
			initFacebook();
			
			$theComments = $('#the-comments');
			$readMoreBtn = $('#comments-read-more-btn');
			$postCommentBtn = $('#post');
			
			isReview = ($('form.reviewForm').length == 0 ? false : true);
			
			// show the report flag on hover of report buttons (using delegate method (bubbling) to avoid adding too many listeners)
			$theComments.delegate('.report', 'mouseenter',
				function(e) {
					$(this).find('.report-bubble').show();
				}
			);
			$theComments.delegate('.report', 'mouseleave',
				function() {
					$(this).find('.report-bubble').hide();
				}
			);
			
			$('#comments-sort').change(function() {
		    	$theComments.empty();
		        getComments($(this).attr('rel'), String($("#comments-sort option:selected").val()));
		    });
		    
		    // Parent id is 0 by default
		    $("#comments_and_review_parent_id").val('0');
		    
		    // Update the label
		    if (isReview) $(".article-comments .reply-form div em").css('background-position', '0 -72px').css('width', '138px');
		    
		    // make sure to remove the background image when the field has focus or there's text in it
		    $("#comments_and_review_body_content").live('focus',function() {
		    	 obj = $(this);
				 if(obj.val() == (isReview ? DEFAULT_REVIEW_TEXT : DEFAULT_COMMENT_TEXT)) {
					 obj.val('');
				 }
		    })
		    .live('blur', function() {
		    	obj = $(this);
		        if($.trim(obj.val()) === '') {
				 obj.addClass('engaged');
		            obj.val((isReview ? DEFAULT_REVIEW_TEXT : DEFAULT_COMMENT_TEXT));
					obj.removeClass('engaged');
		        } 
		    });
		    
		    // in case the page is loaded with content in the textarea
		    if($('textarea').val() !== '') {
		        $('textarea').addClass('engaged');
		    }
			else {
				$('textarea').val((isReview ? DEFAULT_REVIEW_TEXT : DEFAULT_COMMENT_TEXT));
			}
		    
		    $("#reply_comment_instructions").hide();
		    
		    // Clicking reply, sets the parent_id
		    $(".reply-to-comment").live('click', function(evt) {
		    	
		    	evt.preventDefault();
		    	
		    	$('#comments_and_review_body_content').focus();
		        //$("#comment_instructions").html('<em>Add a reply</em> <span>Enter your name and email address to join the discussion.</span>');
		        $(".article-comments .reply-form.comment div em").css('background-position', '0 0px');
		        $("#comments_and_review_parent_id").val($(this).attr('rel'));
		        
		    });
		    
		    // Clicking reply, sets the parent_id
		    $(".view-replies").live('click', function() {
		        var comment_id = $(this).attr('rel');
		        
		        if($('#current-state-for' + comment_id).text() == 'VIEW') {
		          $('#current-state-for' + comment_id).text('HIDE');
		          $(this).css('background-position', '0px -16px');
		          $("#replies-for-" + $(this).attr('rel')).show();
		        } else {
		          $('#current-state-for' + comment_id).text('VIEW');
		          $(this).css('background-position', '0px 0px');
		          $("#replies-for-" + $(this).attr('rel')).hide();
		        }
		        
		        return false;
		    });
		    
		    $('.report').live('click', function() {
		        $(this).append('<span class="altText">Reported</span><span class="reported-bubble"></span>');
		        $('.report-bubble', this).remove();
		        $(this).removeClass('report');
		        $.ajax({
		            url:'/comments/flagComment?id='+ $(this).attr('rel')
		        });
		        
		    });
		    
		    // init post comment button
		    $postCommentBtn.bind('click', submitClickHandler);
		    $postCommentBtn.hide();
		    
		    // init read more button
		    $readMoreBtn.hide() // hide initially, we will show if there are more than COMMENTS_PER_PAGE
		    $readMoreBtn.click(readMoreBtnClickHandler);
		}
		
		function getComments(id, order) {
				
			if(typeof(id) == 'undefined') {
       			return;
    		}
    		    
		    if(typeof(order) == 'undefined') {
		        order = 'recent';
		    }

		    $.ajax({
		        url: '/comments/'+ id +'.json?&order=' + order,
		        dataType: 'json',
		        type: 'GET',
		        
		        success: function(source) {
		        	
		            $('#comments-loader').hide();
		            $('#comment-count').text('(' + source.commentCount + ')');
		            
		            $theComments.empty();
		            
		            var communityRating = 0;
		            var totalRatings = parseFloat(source.comments.length);
		            
		            allComments = source.comments;
		            var commentCount = allComments.length;
		            
		            // show the read more button if there are enough comments
		            if (commentCount > COMMENTS_PER_PAGE) {
		            	$readMoreBtn.show();
		            }
		            
		            if (source.commentCount < 1) {
		            	$('.comments-header').hide();
		            } else {
		            	$('.comments-header').show();
		            }
		            
		            // display the first page of comments;
		            currentCommentPage = 1;
					displayMoreComments(currentCommentPage);
		        	
		           // Figure out the community rating
		           if(ratable == true) {
		           		$('span#communityRating').removeClass().addClass(source.communityRating);
		           }
		        },
		        
		        error: function(xhr, ajaxOptions, thrownError) {
		          $('#comments-loader').hide();
		          $('#comment-count').text('(0)');
		          $theComments.empty();
		        }
		    });
		}
		
		
		// ------------------ private methods ------------------
		
		/*
		* Initialize Facebook JS API
		* note: fb_app_id is set in /apps/fe/templates/layout.php
		*/
		function initFacebook() {
		
		    FB.init({appId: fb_app_id, status: true, cookie: true, xfbml: true, oauth: true});
		
		    // update on login, logout, and once on page load
		    FB.Event.subscribe('auth.login', update);
		    FB.Event.subscribe('auth.logout', update);
		    FB.Event.subscribe('auth.sessionChange', update);
		    FB.getLoginStatus(update);
		}
		
		function update(response) {
			
			var loginText = $('#comment_instructions .facebook-login').empty();
			var loginImage = $('#comment_instructions .facebook-image').empty();
			var actionWord = (isReview ? 'review' : 'comment');
			
			if (response.status != 'connected') {
				loginText.append('<span><strong><a onclick="FB.login(); return false" href="#">Login with Facebook</a> in order to comment</strong></span>');
				loginImage.append((isReview ? '<p>To add a review</p>' : '') + '<span id="comments_fblogin"><fb:login-button>Login with Facebook</fb:login-button></span>');
				$('#comment_instructions').removeClass('logged_in');
				$postCommentBtn.hide();
				
			} else {
				$('#comments_and_review_fb_access_token').val(response.authResponse.accessToken);
				
				$('#comment_instructions').addClass('logged_in');
				
				loginText.append('<span>Welcome <b><fb:name uid="loggedinuser" useyou="false" linked="false"></fb:name></b>.  You are now signed in with your Facebook account.' +
							'<br /><a href="#" onclick="FB.logout(); return false">Click here to sign out</a></span>');
				loginImage.append('<fb:profile-pic uid="loggedinuser" size="square" facebook-logo="true" style="float: right"></fb:profile-pic>');
				
				if (isReview) {
					loginImage.append('<a class="fb-signout" href="#" onclick="FB.logout(); return false">Click here to sign out</a>');
				}
				
				$postCommentBtn.show();
			}
		
			FB.XFBML.parse(document.getElementById('comment_instructions'));
		}
		
		/**
		 * Breaks processing of comments up into timed chunks of 50ms or less
		 * 
		 * @param comments The array of comments to process
		 * @param process The function to call to process each comment
		 * @param callback The function that will be called when all processing has completed
		 * 
		 */
		function processComments(comments, process, callback) {
			var commentsCopy = comments.concat();
			
			setTimeout(function() {
				var start = +new Date();
				
				var commentsHTML = '';
				
				do {
					commentsHTML += process(commentsCopy.shift());
				} while (commentsCopy.length > 0 && (+new Date() - start < 50));
				
				$theComments.append(commentsHTML);
				
				if (commentsCopy.length > 0) {
					setTimeout(arguments.callee, 25);
				} else {
					callback(commentsCopy);
				}
			}, 25);
			
		}
		
		function processComment(comment) {
		
			var commentHTML = '',
				isReview = comment.is_review,
		    	commentDate	= comment.created_on,
		    	id = comment.id,
		    	name = comment.name ? comment.name : '[Deleted]',
		    	facebookPic	= comment.facebook_pic,
		    	ratingClass	= comment.ratingClass,
		    	commentBody = nl2br(comment.body_content, true),
		    	childCommentCount = comment.children.length;
		    	
			
		    commentHTML += '<li id="' + id + '" class="clearfix entry-container entry-' + id + '">' +
		    	(facebookPic != null ? '<div class="photo"><img src="' + facebookPic + '" width="50" height="50" /></div><!-- .photo -->' : '') +
		        '<div class="comment-content">' +
		        	'<div class="comment-header clearfix">' +
		             	'<div class="poster"><span class="name">' + name + ' |</span><span class="timestamp">' + commentDate + '</span>' +
		             	(isReview ? '<div class="entry-review-rating">| Rating: <span id="' + id + '-rating" class="' + ratingClass + '">star rating</span></div>' : '') +
		                '</div><!-- .poster -->' +
		                '<div class="actions clearfix">' +
		                        '<a href="#" class="button-flag report" rel="' + id + '" title="Flag Comment"><span class="altText">Flag Comment</span><span class="report-bubble"></span></a>' +
		                        (!isReview ? '<a href="#" class="button-reply reply-to-comment" rel="' + id + '" title="Reply"><span class="altText">Reply</span></a>' : '') +
		                '</div>' +
		            '</div><!-- .comment-header -->' +
		            '<div class="comments-replies">' +
		            	'<div class="main-comment">' +
		                	'<p>' + commentBody + '</p>' +
		                '</div>';
		                
		    
		    // if there are child comments, append those as well
		    if (childCommentCount > 0) {

		    	var childComments = comment.children;
		    	
		        for (var j = 0; j < childCommentCount; j++) {
		        	isLast = (j == childCommentCount - 1);
		        	commentHTML += processReply(childComments[j], isLast);
		        }
			}
		                            
			commentHTML += '</div><!--.comments-replies -->' +
		        '</div><!-- .comment-content -->' +
		    '</li>';
		    
		    return commentHTML;	
		}
		
		function processReply(reply, isLast) {
			var ccDate = reply.created_on,
        		ccID = reply.id,
        		ccFacebookPic = reply.facebook_pic,
        		ccName = reply.name,
       			ccBody = nl2br(reply.body_content, true);
        	
        	var output = '<div id="' + ccID + '" class="reply clearfix reply-' + ccID + ' ' + (isLast ? 'last' : '') + '">' +
            	'<div class="photo">' +
                	(ccFacebookPic != null ? '<img src="' + ccFacebookPic + '" />' : '') +
                '</div><!-- .photo -->' +
                '<div class="reply-content">' +
                	'<div class="reply-header clearfix">' +
                        '<div class="poster">' + ccName + ' | <span class="timestamp">' + ccDate + '</span>' +
                        '</div><!-- .poster -->' +
                    '</div><!-- .reply-header -->' +
                    '<div class="reply-body">' +
                    	'<p>' + ccBody + '</p>' +
                    '</div>' +
                '</div><!-- reply-content -->' +
            '</div><!-- .reply -->';
            
            return output;
		}
		
		function displayMoreComments(page) {
			
			if (page * COMMENTS_PER_PAGE - COMMENTS_PER_PAGE > allComments.length) return;
			
			var count = Math.min(page * COMMENTS_PER_PAGE, allComments.length);
			
			var commentsHTMLArr = [];
			
	        for (var i = Math.max(count - COMMENTS_PER_PAGE, 0); i < count; i++) {
	            // push each comment string into Array (will join after loop completes)...this is optimized for IE7 which has memory issues as larger and larger strings are concatenated
	            commentsHTMLArr[commentsHTMLArr.length] = processComment(allComments[i]);
	        }
	        
	   		// append the comments to the DOM
	       	$theComments.append(commentsHTMLArr.join(''));
		}
		
		function dummySubmitClickHandler(evt) {
			evt.preventDefault();
		}
		
		function submitClickHandler(evt) {
	        evt.preventDefault();
	        
	        // if the comment is submitting, get outta here!
	        if (isCommentSubmitting) return;
	        
	        var commentText = $("#comments_and_review_body_content").val();
	        
	        if (commentText == DEFAULT_COMMENT_TEXT || 
	        	commentText == DEFAULT_REVIEW_TEXT ||
	        	commentText == '') 
	        {
	        	return;	
	        }
	        
	        isCommentSubmitting = true;
	        
	        $.ajax({
	            url: "/comments/newComment?ratable=" + ratable,
	            type: 'POST',
	            data: $("#comment_form").serialize(),
	            dataType: 'json',
	            success: function(data) {
	        		if (data.success) {
	        			//hold the comment for the Facebook feed call
	        			var comment = $('textarea#comments_and_review_body_content').val();
	        			var parent = $('#comments_and_review_parent_id').attr('value');
	        			
		                FB.api('/me', function(response) {
							var newComment = {
								is_review : ratable,
								created_on : 'Less than a minute ago',
								id : data.id,
								name : response.name,
								facebook_pic : 'http://graph.facebook.com/' + response.id + '/picture',
								ratingClass : data.ratingClass,
								body_content : comment,
								children : []
			                }
			                
			                if (parent != "0") {
			                	$('.comments-replies', '#' + parent).append(processReply(newComment, true));
			                } else {
			                	$('#the-comments').prepend(processComment(newComment));
			                }
						});
						
		                
		                $('input[type=text],textarea', $('#comment_form')).val('').blur();
		                $('div.error', data.form).hide();
		                $('input[type=radio].star',$('#comment_form')).rating('drain');
		                
		                $("#comments_and_review_parent_id").val('0');
		                $("#comments-sort").val('recent');
		                
		                /*
		                 * Facebook popup for posting to feed
		                 */
		                FB.ui({
	                		method: 'feed',
	                		name: document.title,
	                		link: document.URL,
	                		description: comment,
	                		display: 'popup'
		                });
		                
	        		}
	        		else {
	        			$('div.error', data.form).hide();
	        			for (e in data.errors) {
	        				$('div#error-' + e, data.form).show().text(data.errors[e]);
	        			}
	        			
	        			if(data.alsoClearComment) $('input[type=text],textarea', $('#comment_form')).val('').blur();
	        		}
	        		
	        		// reset the button for use again, also make sure that the user is not forced to post another reply
	        		isCommentSubmitting = false;
	            }
	        });
	    	
	    	return false;
	    }
	    
	    function readMoreBtnClickHandler(e) {
	    	e.preventDefault();
	    	
		    currentCommentPage++;	
    		displayMoreComments(currentCommentPage);
    		// hide read more button if there are no more comments to show
    		if (currentCommentPage * COMMENTS_PER_PAGE >= allComments.length) {
    			$(this).hide();
    		}
	    }

		
		// ------------------ public api ------------------
		
		return {
			init: init,
			getComments: getComments
		}
		
	}();
	
	// helper function
	function nl2br (str, is_xhtml) {
	    // http://kevin.vanzonneveld.net
	    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   improved by: Philip Peterson
	    // +   improved by: Onno Marsman
	    // +   improved by: Atli ��r
	    // +   bugfixed by: Onno Marsman
	    // +      input by: Brett Zamir (http://brett-zamir.me)
	    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   improved by: Brett Zamir (http://brett-zamir.me)
	    // +   improved by: Maximusya
	    // *     example 1: nl2br('Kevin\nvan\nZonneveld');
	    // *     returns 1: 'Kevin<br />\nvan<br />\nZonneveld'
	    // *     example 2: nl2br("\nOne\nTwo\n\nThree\n", false);
	    // *     returns 2: '<br>\nOne<br>\nTwo<br>\n<br>\nThree<br>\n'
	    // *     example 3: nl2br("\nOne\nTwo\n\nThree\n", true);
	    // *     returns 3: '<br />\nOne<br />\nTwo<br />\n<br />\nThree<br />\n'
	
	    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
	
	    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
	}

})(jQuery);


jQuery(function() {
	// init comments
	RS.Comments.init();
});
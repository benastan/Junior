# .htaccess example for adding php as a handler for models.
# Junior expects properly formed JSON to be returned when
# constructing a Jr.Model object. Use PHP to dynamically
# generate these files.

<Files ~ "\.(js|json)$">
	SetHandler application/x-httpd-php		
</Files>

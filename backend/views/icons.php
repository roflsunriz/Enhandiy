<?php

// phpcs:disable PSR1.Files.SideEffects.FoundWithSymbols
// phpcs:disable Generic.Files.LineLength.TooLong

// Material Design Icons SVG paths (subset)
$MDI_PATHS = [
    'map-marker' => 'M12,2A7,7 0 0,1 19,9C19,12.52 15.5,17.27 13.36,19.84A1,1 0 0,1 10.64,19.84C8.5,17.27 5,12.52 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,11.05 8.23,12.81 10,13.58V16H14V13.58C15.77,12.81 17,11.05 17,9A5,5 0 0,0 12,4Z',
    'home' => 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z',
    'folder' => 'M10,4H4C2.9,4 2,4.9 2,6V18C2,19.11 2.9,20 4,20H20C21.11,20 22,19.11 22,18V8C22,6.9 21.11,6 20,6H12L10,4Z',
    'pencil' => 'M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.62L18.38,3.29C18.19,3.1 17.93,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z',
    'trash-can' => 'M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6Z',
    'folder-move' => 'M20,6H12L10,4H4C2.9,4 2,4.9 2,6V18C2,19.11 2.89,20 4,20H20C21.11,20 22,19.11 22,18V8C22,6.9 21.11,6 20,6M18,14H13V16L9,12L13,8V10H18V14Z'
];

function render_icon(string $name, int $size = 16, string $class = 'icon')
{
    global $MDI_PATHS;
    if (!isset($MDI_PATHS[$name])) {
        return '';
    }
    $w = (string)$size;
    $h = (string)$size;
    $path = $MDI_PATHS[$name];
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' . $w . '" height="' . $h . '" viewBox="0 0 24 24" fill="currentColor" class="' . htmlspecialchars($class) . '"><path d="' . $path . '"></path></svg>';
}

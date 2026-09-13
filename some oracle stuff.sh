JPFeK59ycAgPgbw$

sudo dd iflag=direct if=/dev/oracleoci/oraclevda of=/dev/null count=1
echo "1" | sudo tee /sys/class/block/`readlink /dev/oracleoci/oraclevda | cut -d'/' -f 2`/device/rescan
CREATE USER 'oci_repl'@'10.0.0.%' IDENTIFIED WITH caching_sha2_password BY 'm0xvx260dgXhB0ySFUnlDXXR';
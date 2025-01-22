#!/usr/bin/env bash
# Author:   Shravan Dwarka
# Date:     2024-09-12
# Purpose:  Git pull, restart pd-icinga2-middleware.service
#           To run with user nagios

help() {
    echo "Usage: $(basename $0) [-h|--help] [-r|--restart]"
    echo "  -h|--help       Displays this help"
    echo "  -r|--restart    Restart the service after successful git pull"
}

TEMP=$(getopt -o hr --long help,restart -- "$@")

if [[ "$?" -ne 0 ]]; then
    echo "Terminating..." >&2
    exit 1
fi

eval set -- "$TEMP"

while true; do
    case $1 in
        -h|--help)
            help
            shift
            exit 0
            ;;
        -r|--restart)
            RESTART=1
            shift 2
            break
            ;;
        --)
            shift
            break
            ;;
        *)
            echo "Error" >&2
            exit 1
            ;;
    esac
done

pushd /opt/pagerduty-icinga2-middleware > /dev/null
sudo -u nagios bash -c "git stash; git stash drop; git pull"
popd > /dev/null

if [[ "$RESTART" -eq 1 ]]; then
    sudo systemctl restart pd-icinga2-middleware.service
fi

export function getTimeInterval(timeIn: string | null | undefined, timeOut: string | null | undefined){
    let timeInTimeInDecimal = Number(timeIn?.split(":")[0]) + (Number(timeIn?.split(":")[1])/60)
    let timeOutTimeInDecimal = Number(timeOut?.split(":")[0]) + (Number(timeOut?.split(":")[1])/60)

    if(isNaN(timeInTimeInDecimal) || isNaN(timeOutTimeInDecimal)) return 0

    if(timeOutTimeInDecimal < timeInTimeInDecimal){
        timeOutTimeInDecimal += 24
    }

    return timeOutTimeInDecimal - timeInTimeInDecimal
}